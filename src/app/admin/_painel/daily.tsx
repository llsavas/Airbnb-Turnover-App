import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { NO_BUILDING, aptLabel, groupByBuilding } from "@/lib/buildings";
import { listCleaners, listCleanings, listMaintenances } from "@/lib/data";
import { addDays, formatDay, formatTime, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { FlameIcon } from "@/components/ui";
import { BuildingAccordion, UrgentBadge } from "./building-accordion";
import { DailyCleaningCard } from "./daily-card";

export async function DailyView({
  date,
  building,
  link,
}: {
  date: string;
  building: string;
  link: (params: Record<string, string>) => string;
}) {
  const [allCleanings, cleaners, allMaintenances] = await Promise.all([
    listCleanings({ from: date, to: date }),
    listCleaners(),
    listMaintenances({ from: date, to: date, status: "scheduled" }),
  ]);
  const inBuilding = (b: string | null | undefined) => !building || (b ?? NO_BUILDING) === building;
  const cleanings = allCleanings.filter((c) => c.status !== "cancelled" && inBuilding(c.property?.building));
  const maintenances = allMaintenances.filter((m) => inBuilding(m.property?.building));

  // Photos taken so far: checklist photos plus problem reports.
  const supabase = await createClient();
  const ids = cleanings.map((c) => c.id);
  const [{ data: taskPhotos }, { data: issuePhotos }] = ids.length
    ? await Promise.all([
        supabase.from("cleaning_tasks").select("cleaning_id").in("cleaning_id", ids).not("photo_path", "is", null),
        supabase.from("issues").select("cleaning_id, photo_paths").in("cleaning_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const photos = new Map<string, number>();
  for (const t of taskPhotos ?? []) photos.set(t.cleaning_id, (photos.get(t.cleaning_id) ?? 0) + 1);
  for (const i of issuePhotos ?? []) {
    photos.set(i.cleaning_id, (photos.get(i.cleaning_id) ?? 0) + i.photo_paths.length);
  }

  const sameDay = (c: (typeof cleanings)[number]) => c.next_checkin === c.date;
  const done = cleanings.filter((c) => c.status === "completed").length;
  const urgent = cleanings.filter((c) => sameDay(c) && c.status !== "completed").length;
  const isToday = date === today();

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-2">
        <Link href={link({ dia: addDays(date, -1) })} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Dia anterior">
          ‹
        </Link>
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums">
            {done}/{cleanings.length} apartamentos limpos
          </p>
          <p className="text-sm text-slate-500 capitalize">
            {formatDay(date)}
            {!isToday && (
              <Link href={link({ dia: today() })} className="ml-2 font-medium text-brand-700 normal-case">
                voltar para hoje
              </Link>
            )}
          </p>
        </div>
        <Link href={link({ dia: addDays(date, 1) })} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Próximo dia">
          ›
        </Link>
      </Card>

      {urgent > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 ring-1 ring-red-200">
          <FlameIcon />
          {urgent} {urgent === 1 ? "entrada no mesmo dia" : "entradas no mesmo dia"} — limpar primeiro
        </p>
      )}

      {cleanings.length === 0 ? (
        <EmptyState>Nenhuma limpeza neste dia.</EmptyState>
      ) : (
        <div className="space-y-3">
          {groupByBuilding(cleanings, (c) => c.property?.building).map((group) => {
            // Same-day check-ins first inside each building.
            const items = [...group.items].sort((a, b) => Number(sameDay(b)) - Number(sameDay(a)));
            return (
              <BuildingAccordion
                key={group.building}
                building={group.building}
                done={items.filter((c) => c.status === "completed").length}
                total={items.length}
                doneLabel="concluídas"
                badge={<UrgentBadge count={items.filter(sameDay).length} singular="entrada" plural="entradas" />}
              >
                <div className="space-y-3 p-3">
                  {items.map((c) => (
                    <DailyCleaningCard key={c.id} cleaning={c} cleaners={cleaners} photos={photos.get(c.id) ?? 0} />
                  ))}
                </div>
              </BuildingAccordion>
            );
          })}
        </div>
      )}

      <section className="pt-2">
        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Agenda operacional</p>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Manutenções do dia</h2>
          <Link href={`/admin/manutencoes?dia=${date}`} className="text-sm font-medium text-brand-700">
            Agendar →
          </Link>
        </div>
        {maintenances.length === 0 ? (
          <EmptyState>Nenhuma manutenção programada para este dia.</EmptyState>
        ) : (
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {maintenances.map((m) => (
              <Link key={m.id} href="/admin/manutencoes" className="block px-4 py-3 hover:bg-slate-50">
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-slate-500">
                  {aptLabel(m.property)}
                  {m.time && ` · ${formatTime(m.time)}`}
                  {m.assignee && ` · ${m.assignee}`}
                </p>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
