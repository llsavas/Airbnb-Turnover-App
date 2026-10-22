import "server-only";
import { addDays, today } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/server";

const API_URL = "https://public.api.hospitable.com/v2";
// Cleanings are created for checkouts from yesterday until this many days ahead.
const DAYS_AHEAD = 30;
// How far past the window to look for the next check-in after a checkout.
const NEXT_CHECKIN_LOOKAHEAD = 30;
// Property ids per request, to keep URLs short.
const CHUNK_SIZE = 20;

type HospitableReservation = {
  id: string;
  check_in: string; // "2026-10-20T15:00:00-03:00", already in the property's time zone
  check_out: string;
  status?: string;
  reservation_status?: { current?: { category?: string } };
  guests?: { total?: number };
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
      include: "properties",
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
    const from = addDays(today(), -1);
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
