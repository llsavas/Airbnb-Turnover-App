import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { groupByBuilding } from "@/lib/buildings";
import { listCleanings } from "@/lib/data";
import { addDays, formatDay, formatTime, today } from "@/lib/dates";
import type { CleaningWithRelations } from "@/lib/types";

export const metadata: Metadata = { title: "Minhas limpezas" };

function CleaningCard({ cleaning }: { cleaning: CleaningWithRelations }) {
  const timeWindow = [formatTime(cleaning.starts_at), formatTime(cleaning.ends_at)]
    .filter(Boolean)
    .join(" – ");
  return (
    <Link href={`/limpezas/${cleaning.id}`} className="block">
      <Card className="flex items-center justify-between gap-3 transition hover:ring-brand-600">
        <div className="min-w-0">
          {cleaning.property?.building && (
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{cleaning.property.building}</p>
          )}
          <p className="truncate text-base font-semibold">{cleaning.property?.name}</p>
          <p className="truncate text-sm text-slate-500">{cleaning.property?.address}</p>
          {timeWindow && <p className="mt-1 text-sm font-medium text-slate-700">{timeWindow}</p>}
        </div>
        <StatusBadge status={cleaning.status} />
      </Card>
    </Link>
  );
}

// Same building together, so the day's route goes building by building.
function byBuilding(cleanings: CleaningWithRelations[]) {
  return groupByBuilding(cleanings, (c) => c.property?.building).flatMap((g) => g.items);
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
