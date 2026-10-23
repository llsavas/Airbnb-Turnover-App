import "server-only";
import {
  readDepartureTime,
  readGuestDetails,
  readGuestDetailsByPattern,
  type GuestDetails,
} from "@/lib/checkin-ai";
import { addDays, today } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/server";

const API_URL = "https://public.api.hospitable.com/v2";
// Cleanings are created for checkouts from the start of the current month (so
// the monthly calendar is complete) until this many days ahead.
const DAYS_AHEAD = 30;
// How far past the window to look for the next check-in after a checkout.
const NEXT_CHECKIN_LOOKAHEAD = 30;
// Property ids per request, to keep URLs short.
const CHUNK_SIZE = 20;

type HospitableReservation = {
  id: string;
  code?: string;
  platform?: string;
  check_in: string; // "2026-10-20T15:00:00-03:00", already in the property's time zone
  check_out: string;
  status?: string;
  reservation_status?: { current?: { category?: string } };
  guests?: { total?: number };
  guest?: { first_name?: string | null; last_name?: string | null };
  last_message_at?: string | null;
  properties?: { id: string }[];
};

type HospitableProperty = {
  id: string;
  name: string;
  listed: boolean;
  checkin?: string;
  checkout?: string;
  address?: { street?: string; number?: string; city?: string };
};

export type SyncResult = { created: number; updated: number; cancelled: number };

function token() {
  const value = process.env.HOSPITABLE_API_TOKEN;
  if (!value) throw new Error("HOSPITABLE_API_TOKEN não configurado.");
  return value;
}

// Fetches every page of a list endpoint.
async function getAll<T>(path: string, params: URLSearchParams): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; ; page++) {
    params.set("page", String(page));
    params.set("per_page", "100");
    const res = await fetch(`${API_URL}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Hospitable respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const body = (await res.json()) as { data: T[]; meta?: { last_page?: number } };
    results.push(...body.data);
    if (!body.meta?.last_page || page >= body.meta.last_page) return results;
  }
}

async function getReservations(
  propertyIds: string[],
  dateQuery: "checkin" | "checkout",
  from: string,
  to: string,
): Promise<HospitableReservation[]> {
  const byId = new Map<string, HospitableReservation>();
  for (let i = 0; i < propertyIds.length; i += CHUNK_SIZE) {
    const params = new URLSearchParams({
      start_date: from,
      end_date: to,
      date_query: dateQuery,
      include: "properties,guest",
    });
    propertyIds.slice(i, i + CHUNK_SIZE).forEach((id) => params.append("properties[]", id));
    for (const r of await getAll<HospitableReservation>("/reservations", params)) byId.set(r.id, r);
  }
  return [...byId.values()].filter(
    (r) => (r.reservation_status?.current?.category ?? r.status) === "accepted",
  );
}

const day = (iso: string) => iso.slice(0, 10);
const time = (iso: string) => iso.slice(11, 16);

// Creates a cleaning for every checkout in the window, with the deadline taken
// from the next check-in, and cancels cleanings whose reservation is gone.
export async function syncHospitable(): Promise<SyncResult> {
  const supabase = createAdminClient();
  const { data: run } = await supabase
    .from("sync_runs")
    .insert({ source: "hospitable" })
    .select("id")
    .single();

  try {
    const { data: properties, error } = await supabase
      .from("properties")
      .select("id, hospitable_property_id")
      .eq("active", true)
      .not("hospitable_property_id", "is", null);
    if (error) throw error;

    const localId = new Map(properties.map((p) => [p.hospitable_property_id as string, p.id]));
    const hospitableIds = [...localId.keys()];
    const from = [addDays(today(), -1), `${today().slice(0, 7)}-01`].sort()[0];
    const to = addDays(today(), DAYS_AHEAD);

    const [checkouts, checkins] = await Promise.all([
      getReservations(hospitableIds, "checkout", from, to),
      getReservations(hospitableIds, "checkin", from, addDays(to, NEXT_CHECKIN_LOOKAHEAD)),
    ]);

    const arrivalsByProperty = new Map<string, HospitableReservation[]>();
    for (const r of checkins) {
      const propertyId = r.properties?.[0]?.id;
      if (!propertyId) continue;
      arrivalsByProperty.set(propertyId, [...(arrivalsByProperty.get(propertyId) ?? []), r]);
    }
    for (const list of arrivalsByProperty.values()) list.sort((a, b) => a.check_in.localeCompare(b.check_in));

    const items = checkouts.flatMap((r) => {
      const hospitableId = r.properties?.[0]?.id;
      const propertyId = hospitableId && localId.get(hospitableId);
      if (!propertyId) return [];
      const date = day(r.check_out);
      const next = arrivalsByProperty
        .get(hospitableId)
        ?.find((a) => a.id !== r.id && day(a.check_in) >= date);
      return [
        {
          external_id: r.id,
          property_id: propertyId,
          date,
          starts_at: time(r.check_out),
          // Only a same-day check-in sets a deadline for this cleaning.
          ends_at: next && day(next.check_in) === date ? time(next.check_in) : null,
          next_checkin: next ? day(next.check_in) : null,
          // Guests of the next stay: what the cleaner has to prepare for.
          guest_count: next?.guests?.total ?? null,
        },
      ];
    });

    const { data: result, error: syncError } = await supabase.rpc("sync_cleanings", {
      p_source: "hospitable",
      p_from: from,
      p_to: to,
      p_property_ids: [...localId.values()],
      p_items: items,
    });
    if (syncError) throw syncError;

    // Arrivals feed the Check-ins tab. Only reservation fields are written, so
    // what the AI read from the chat and the "registered" flag are kept.
    const arrivals = checkins.filter((r) => day(r.check_in) >= from && day(r.check_in) <= to);
    const checkinRows = arrivals.flatMap((r) => {
      const propertyId = r.properties?.[0]?.id && localId.get(r.properties[0].id);
      if (!propertyId) return [];
      const guestName = [r.guest?.first_name, r.guest?.last_name].filter(Boolean).join(" ").trim();
      return [
        {
          external_id: r.id,
          property_id: propertyId,
          reservation_code: r.code ?? null,
          platform: r.platform ?? null,
          guest_name: guestName || null,
          guest_count: r.guests?.total ?? null,
          checkin_date: day(r.check_in),
          checkin_time: time(r.check_in),
          checkout_date: day(r.check_out),
          last_message_at: r.last_message_at ?? null,
          cancelled: false,
        },
      ];
    });
    if (checkinRows.length > 0) {
      const { error: checkinError } = await supabase
        .from("checkins")
        .upsert(checkinRows, { onConflict: "external_id" });
      if (checkinError) throw checkinError;
    }
    let cancelQuery = supabase
      .from("checkins")
      .update({ cancelled: true })
      .gte("checkin_date", from)
      .lte("checkin_date", to)
      .eq("cancelled", false);
    if (checkinRows.length > 0) {
      cancelQuery = cancelQuery.not("external_id", "in", `(${checkinRows.map((c) => `"${c.external_id}"`).join(",")})`);
    }
    const { error: cancelError } = await cancelQuery;
    if (cancelError) throw cancelError;

    const counts = result as SyncResult;
    if (run) {
      await supabase
        .from("sync_runs")
        .update({ ...counts, ok: true, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    return counts;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (run) {
      await supabase
        .from("sync_runs")
        .update({ ok: false, message, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    throw error;
  }
}

// Adds listed Hospitable properties that aren't in the app yet. Existing ones
// are left alone so edits made in the app aren't overwritten.
export async function importHospitableProperties(): Promise<number> {
  const properties = (await getAll<HospitableProperty>("/properties", new URLSearchParams())).filter(
    (p) => p.listed,
  );
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .upsert(
      properties.map((p) => ({
        hospitable_property_id: p.id,
        name: p.name.replace(/\s+/g, " ").trim(),
        address: [p.address?.street, p.address?.number].filter(Boolean).join(", ") || null,
        city: p.address?.city ?? null,
        checkout_time: p.checkout ?? "11:00",
        checkin_time: p.checkin ?? "15:00",
      })),
      { onConflict: "hospitable_property_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return data.length;
}

type HospitableMessage = {
  body: string | null;
  sender_type: string; // "guest" | "host"
  created_at: string;
};

// Reads the reservation chat for the next few days' arrivals and stores what
// the front desk needs: every guest's name and CPF, arrival time and car
// plate. Only reservations with new messages since the last AI read are sent
// again. If the AI is unavailable, CPFs and plates are still picked up by
// pattern and the reservation is retried on the next run.
export async function extractCheckinDetails(
  daysAhead = 3,
): Promise<{ read: number; aiError: string | null }> {
  const supabase = createAdminClient();
  const from = today();
  const { data: pending, error } = await supabase
    .from("checkins")
    .select("id, external_id, guest_name, last_message_at, extracted_at")
    .gte("checkin_date", from)
    .lte("checkin_date", addDays(from, daysAhead))
    .eq("cancelled", false);
  if (error) throw error;

  const toRead = pending.filter(
    (c) => !c.extracted_at || (c.last_message_at && c.last_message_at > c.extracted_at),
  );

  let read = 0;
  let aiError: string | null = null;
  // A few at a time: Hospitable limits message reads.
  for (let i = 0; i < toRead.length; i += 4) {
    await Promise.all(
      toRead.slice(i, i + 4).map(async (checkin) => {
        const res = await fetch(`${API_URL}/reservations/${checkin.external_id}/messages`, {
          headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const { data: messages } = (await res.json()) as { data: HospitableMessage[] };

        let details: GuestDetails;
        let extractedAt: string | null = new Date().toISOString();
        try {
          details = await readGuestDetails(checkin.guest_name, messages);
        } catch (e) {
          aiError ??= e instanceof Error ? e.message : String(e);
          details = readGuestDetailsByPattern(messages);
          extractedAt = null;
        }
        const { error: updateError } = await supabase
          .from("checkins")
          .update({ ...details, extracted_at: extractedAt })
          .eq("id", checkin.id);
        if (updateError) throw updateError;
        read++;
      }),
    );
  }
  return { read, aiError };
}

// Reads the chat of today's and tomorrow's departures for the time the guest
// said they'll leave. Only times earlier than the normal checkout are kept:
// that is what lets the cleaning start sooner.
export async function extractDepartureTimes(): Promise<number> {
  const supabase = createAdminClient();
  const from = today();
  const { data: cleanings, error } = await supabase
    .from("cleanings")
    .select("id, external_id, starts_at")
    .eq("source", "hospitable")
    .eq("status", "scheduled")
    .gte("date", from)
    .lte("date", addDays(from, 1));
  if (error) throw error;

  let found = 0;
  for (let i = 0; i < cleanings.length; i += 4) {
    await Promise.all(
      cleanings.slice(i, i + 4).map(async (cleaning) => {
        const res = await fetch(`${API_URL}/reservations/${cleaning.external_id}/messages`, {
          headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const { data: messages } = (await res.json()) as { data: HospitableMessage[] };
        const said = await readDepartureTime(messages);
        const earlier = said && cleaning.starts_at && said < cleaning.starts_at.slice(0, 5) ? said : null;
        if (earlier) found++;
        const { error: updateError } = await supabase
          .from("cleanings")
          .update({ guest_departure_time: earlier, departure_read_at: new Date().toISOString() })
          .eq("id", cleaning.id);
        if (updateError) throw updateError;
      }),
    );
  }
  return found;
}
