import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, FlameIcon, Select, StatusBadge, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { groupByBuilding } from "@/lib/buildings";
import { listCleaners, listCleanings } from "@/lib/data";
import { addDays, formatDay, formatHourOf, formatTime, today } from "@/lib/dates";
import type { CleaningWithRelations } from "@/lib/types";

export const metadata: Metadata = { title: "Minhas limpezas" };

function CleaningCard({ cleaning, query }: { cleaning: CleaningWithRelations; query: string }) {
  const timeWindow = [formatTime(cleaning.starts_at), formatTime(cleaning.ends_at)]
    .filter(Boolean)
    .join(" – ");
  const urgent = cleaning.next_checkin === cleaning.date && cleaning.status !== "completed";
  return (
    <Link href={`/limpezas/${cleaning.id}${query}`} className="block">
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

export default async function MyCleaningsPage({ searchParams }: PageProps<"/limpezas">) {
  const profile = await requireUser();
  const day = today();

  // Admins see the app as a member of the team ("Ver como"); until they pick
  // someone, it opens on whoever has the most cleanings today.
  const isAdmin = profile.role === "admin";
  const cleaners = isAdmin ? await listCleaners() : [];
  const { como } = await searchParams;
  let viewed = profile;
  if (isAdmin) {
    const picked = cleaners.find((c) => c.id === como);
    if (picked) {
      viewed = picked;
    } else {
      const todayCount = new Map<string, number>();
      for (const c of await listCleanings({ from: day, to: day })) {
        if (c.cleaner_id) todayCount.set(c.cleaner_id, (todayCount.get(c.cleaner_id) ?? 0) + 1);
      }
      viewed =
        [...cleaners].sort((a, b) => (todayCount.get(b.id) ?? 0) - (todayCount.get(a.id) ?? 0))[0] ?? profile;
    }
  }
  const query = isAdmin && viewed.id !== profile.id ? `?como=${viewed.id}` : "";

  const cleanings = (
    await listCleanings({ from: addDays(day, -1), to: addDays(day, 14), cleanerId: viewed.id })
  ).filter((c) => c.status !== "cancelled");

  // Unfinished work from yesterday stays at the top until it's done.
  const pending = byBuilding(cleanings.filter((c) => c.date < day && c.status !== "completed"));
  const todays = byBuilding(cleanings.filter((c) => c.date === day));
  const upcoming = cleanings.filter((c) => c.date > day);
  const upcomingDays = [...new Set(upcoming.map((c) => c.date))];

  return (
    <div className="mx-auto max-w-xl">
      {isAdmin && (
        <form className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm ring-1 ring-sky-200">
          <span className="font-medium text-sky-700">Ver como:</span>
          <div className="min-w-0 flex-1">
            <Select name="como" defaultValue={viewed.id} aria-label="Pessoa da equipe" className="py-1.5">
              {cleaners.length === 0 && <option value={profile.id}>Ninguém na equipe ainda</option>}
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </div>
          <button className={buttonClass("secondary", "py-1.5")}>Ver</button>
          <p className="w-full text-xs text-sky-700">
            Você está vendo o app da equipe como essa pessoa vê. Ações feitas aqui (iniciar, concluir,
            fotos) valem de verdade.
          </p>
        </form>
      )}
      <h1 className="text-xl font-bold">Olá, {viewed.full_name.split(" ")[0]}!</h1>
      <p className="mb-5 text-sm text-slate-500 capitalize">{formatDay(day)}</p>

      {pending.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="font-semibold text-red-700">Pendentes de ontem</h2>
          {pending.map((c) => (
            <CleaningCard key={c.id} cleaning={c} query={query} />
          ))}
        </section>
      )}

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">Hoje</h2>
        {todays.length === 0 ? (
          <EmptyState>Nenhuma limpeza para hoje.</EmptyState>
        ) : (
          todays.map((c) => <CleaningCard key={c.id} cleaning={c} query={query} />)
        )}
      </section>

      {upcomingDays.map((d) => (
        <section key={d} className="mb-6 space-y-2">
          <h2 className="font-semibold capitalize text-slate-700">{formatDay(d)}</h2>
          {byBuilding(upcoming.filter((c) => c.date === d)).map((c) => (
            <CleaningCard key={c.id} cleaning={c} query={query} />
          ))}
        </section>
      ))}
    </div>
  );
}
