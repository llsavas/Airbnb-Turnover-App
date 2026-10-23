import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState } from "@/components/ui";
import { aptLabel, groupByBuilding, inBuildings } from "@/lib/buildings";
import { addDays, formatDayShort, formatHour, formatShortDate, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { CheckinWithProperty } from "@/lib/types";
import { setCheckinRegistered, syncCheckins } from "../actions";
import { BuildingAccordion } from "./building-accordion";

const DAYS_AHEAD = 3;

// One line per guest ("Nome | CPF: 000.000.000-00"), then arrival and plate:
// the format the front desk receives.
function Notes({ checkin }: { checkin: CheckinWithProperty }) {
  const pending = <span className="text-amber-700">pendente no chat</span>;
  const guests = checkin.guests.length
    ? checkin.guests
    : [{ name: checkin.guest_name ?? "", cpf: null }];
  const missing = Math.max(0, (checkin.guest_count ?? 0) - checkin.guests.length);
  return (
    <div className="space-y-0.5 rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
      {guests.map((g, i) => (
        <p key={i}>
          {g.name || <span className="text-slate-500">(nome não identificado)</span>} | CPF:{" "}
          {g.cpf ?? pending}
        </p>
      ))}
      {missing > 0 && checkin.guests.length > 0 && (
        <p className="text-amber-700">
          {missing === 1 ? "Falta 1 hóspede" : `Faltam ${missing} hóspedes`} (nome e CPF)
        </p>
      )}
      <p>
        Chegada:{" "}
        {checkin.arrival_time ?? (
          <span className="text-slate-500">
            não informada{checkin.checkin_time && ` (check-in a partir das ${formatHour(checkin.checkin_time)})`}
          </span>
        )}
      </p>
      {checkin.vehicle_plate && <p>Placa: {checkin.vehicle_plate}</p>}
      {checkin.ai_notes && <p className="text-slate-600">{checkin.ai_notes}</p>}
    </div>
  );
}

function CheckinItem({ checkin }: { checkin: CheckinWithProperty }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <form action={setCheckinRegistered.bind(null, checkin.id, !checkin.registered)}>
        <button
          aria-label={checkin.registered ? "Desmarcar envio à portaria" : "Marcar como enviado à portaria"}
          title={checkin.registered ? "Enviado à portaria" : "Marcar como enviado à portaria"}
          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
            checkin.registered ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-500"
          }`}
        >
          {checkin.registered && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.5-9.5-1.2-1.2z" />
            </svg>
          )}
        </button>
      </form>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-semibold">{aptLabel(checkin.property)}</p>
          <p className="text-xs text-slate-500">
            Check-in {formatDayShort(checkin.checkin_date)}
            {checkin.checkout_date && ` • saída ${formatDayShort(checkin.checkout_date)}`}
            {checkin.guest_count && ` • ${checkin.guest_count} hóspede(s)`}
            {checkin.platform && ` • ${checkin.platform}`}
          </p>
        </div>
        <Notes checkin={checkin} />
      </div>
    </div>
  );
}

export async function CheckinsView({ buildings }: { buildings: string[] }) {
  const from = today();
  const to = addDays(from, DAYS_AHEAD);
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("*, property:properties(id, name, building)")
    .gte("checkin_date", from)
    .lte("checkin_date", to)
    .eq("cancelled", false)
    .order("checkin_date")
    .order("checkin_time");
  const checkins = ((data ?? []) as CheckinWithProperty[]).filter(
    (c) => inBuildings(buildings, c.property?.building),
  );
  const registered = checkins.filter((c) => c.registered).length;
  const days = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(from, i));
  const pendingCpf = checkins.filter((c) => !c.guests.some((g) => g.cpf)).length;

  return (
    <div className="space-y-4">
      <ActionForm action={syncCheckins}>
        <SubmitButton variant="secondary" className="w-full">
          ↻ Sincronizar Hospitable (nomes, CPF e horários)
        </SubmitButton>
      </ActionForm>

      <Card className="text-center">
        <p className="text-xl font-bold tabular-nums">
          {registered}/{checkins.length} check-ins enviados à portaria
        </p>
        <p className="text-sm text-slate-500">
          Hoje e próximos {DAYS_AHEAD} dias ({formatShortDate(from)} a {formatShortDate(to)})
          {pendingCpf > 0 && ` · ${pendingCpf} sem CPF`}
        </p>
      </Card>

      {checkins.length === 0 ? (
        <EmptyState>Nenhum check-in nestes dias. Toque em sincronizar para buscar no Hospitable.</EmptyState>
      ) : (
        days.map((day) => {
          const dayCheckins = checkins.filter((c) => c.checkin_date === day);
          if (dayCheckins.length === 0) return null;
          return (
            <section key={day} className="space-y-2">
              <h2 className="font-semibold capitalize">
                {formatDayShort(day)}
                <span className="ml-2 text-sm font-normal text-slate-500 normal-case">
                  {dayCheckins.filter((c) => c.registered).length}/{dayCheckins.length} enviados
                </span>
              </h2>
              {groupByBuilding(dayCheckins, (c) => c.property?.building).map((group) => (
                <BuildingAccordion
                  key={group.building}
                  building={group.building}
                  done={group.items.filter((c) => c.registered).length}
                  total={group.items.length}
                  doneLabel="enviados"
                >
                  <div className="divide-y divide-slate-100">
                    {group.items.map((c) => (
                      <CheckinItem key={c.id} checkin={c} />
                    ))}
                  </div>
                </BuildingAccordion>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
