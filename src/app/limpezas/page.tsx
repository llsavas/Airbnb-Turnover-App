import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, FlameIcon, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { groupByBuilding } from "@/lib/buildings";
import { listCleanings } from "@/lib/data";
import { addDays, formatDay, formatHourOf, formatTime, today } from "@/lib/dates";
import type { CleaningWithRelations } from "@/lib/types";

export const metadata: Metadata = { title: "Minhas limpezas" };

function CleaningCard({ cleaning }: { cleaning: CleaningWithRelations }) {
  const timeWindow = [formatTime(cleaning.starts_at), formatTime(cleaning.ends_at)]
    .filter(Boolean)
    .join(" – ");
  const urgent = cleaning.next_checkin === cleaning.date && cleaning.status !== "completed";
  return (
    <Link href={`/limpezas/${cleaning.id}`} className="block">
      <Card
        className={`flex items-center justify-between gap-3 transition hover:ring-brand-600 ${urgent ? "ring-2 ring-red-700" : ""}`}
      >
        <div className="min-w-0">
          {cleaning.property?.building && (
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{cleaning.property.building}</p>
          )}
          <p className="truncate text-base font-semibold">{cleaning.property?.name}</p>
          <p className="truncate text-sm text-slate-500">{cleaning.property?.address}</p>
          {timeWindow && <p className="mt-1 text-sm font-medium text-slate-700">{timeWindow}</p>}
          {(urgent || cleaning.released_at) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {urgent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                  <FlameIcon /> Entrada no mesmo dia
                </span>
              )}
              {cleaning.released_at && cleaning.status === "scheduled" && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  Liberado às {formatHourOf(cleaning.released_at)}: pode começar
                </span>
              )}
            </div>
          )}
          {cleaning.notes && (
            <p className="mt-1.5 line-clamp-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
              📝 {cleaning.notes}
            </p>
          )}
        </div>
        <StatusBadge status={cleaning.status} />
      </Card>
    </Link>
  );
}

// Same building together, so the day's route goes building by building.
// Inside each building, same-day check-ins come first.
function byBuilding(cleanings: CleaningWithRelations[]) {
  const urgent = (c: CleaningWithRelations) => Number(c.next_checkin === c.date);
  return groupByBuilding(cleanings, (c) => c.property?.building).flatMap((g) =>
    [...g.items].sort((a, b) => urgent(b) - urgent(a)),
  );
}

export default async function MyCleaningsPage() {
  const profile = await requireUser();
  const day = today();
  const cleanings = (
    await listCleanings({ from: addDays(day, -1), to: addDays(day, 14), cleanerId: profile.id })
  ).filter((c) => c.status !== "cancelled");

  // Unfinished work from yesterday stays at the top until it's done.
  const pending = byBuilding(cleanings.filter((c) => c.date < day && c.status !== "completed"));
  const todays = byBuilding(cleanings.filter((c) => c.date === day));
  const upcoming = cleanings.filter((c) => c.date > day);
  const upcomingDays = [...new Set(upcoming.map((c) => c.date))];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold">Olá, {profile.full_name.split(" ")[0]}!</h1>
      <p className="mb-5 text-sm text-slate-500 capitalize">{formatDay(day)}</p>

      {pending.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="font-semibold text-red-700">Pendentes de ontem</h2>
          {pending.map((c) => (
            <CleaningCard key={c.id} cleaning={c} />
          ))}
        </section>
      )}

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">Hoje</h2>
        {todays.length === 0 ? (
          <EmptyState>Nenhuma limpeza para hoje.</EmptyState>
        ) : (
          todays.map((c) => <CleaningCard key={c.id} cleaning={c} />)
        )}
      </section>

      {upcomingDays.map((d) => (
        <section key={d} className="mb-6 space-y-2">
          <h2 className="font-semibold capitalize text-slate-700">{formatDay(d)}</h2>
          {byBuilding(upcoming.filter((c) => c.date === d)).map((c) => (
            <CleaningCard key={c.id} cleaning={c} />
          ))}
        </section>
      ))}
    </div>
  );
}
