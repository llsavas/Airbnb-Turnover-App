import Link from "next/link";
import { Card, EmptyState, FlameIcon } from "@/components/ui";
import { aptLabel, groupByBuilding, inBuildings } from "@/lib/buildings";
import {
  countPhotosForDate,
  listBuildingStock,
  listCleaners,
  listCleaningTeamIssues,
  listCleanings,
  listMaintenances,
} from "@/lib/data";
import { addDays, formatDay, formatTime, today } from "@/lib/dates";
import { BuildingAccordion, UrgentBadge } from "./building-accordion";
import { BuildingStockForm } from "./building-stock";
import { DailyCleaningCard, TeamCleaningCard } from "./daily-card";

// Diário tab, shared by the admin panel and the team app ("team" mode shows
// read-only cards that open the cleaning).
export async function DailyView({
  date,
  buildings,
  link,
  mode,
}: {
  date: string;
  buildings: string[];
  link: (params: Record<string, string>) => string;
  mode: "admin" | "team";
}) {
  const [allCleanings, cleaners, allMaintenances, stock, photos, todos] = await Promise.all([
    listCleanings({ from: date, to: date }),
    mode === "admin" ? listCleaners() : Promise.resolve([]),
    mode === "admin" ? listMaintenances({ from: date, to: date, status: "scheduled" }) : Promise.resolve([]),
    // The team counts each building's stock from its block.
    mode === "team" ? listBuildingStock() : Promise.resolve([]),
    countPhotosForDate(date),
    listCleaningTeamIssues(),
  ]);
  // Problems the cleaning team should fix in each apartment.
  const todoCount = new Map<string, number>();
  for (const i of todos) todoCount.set(i.property_id, (todoCount.get(i.property_id) ?? 0) + 1);
  const stockOf = new Map(stock.map((s) => [s.building, s]));
  const cleanings = allCleanings.filter((c) => c.status !== "cancelled" && inBuildings(buildings, c.property?.building));
  const maintenances = allMaintenances.filter((m) => inBuildings(buildings, m.property?.building));

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
          {urgent} {urgent === 1 ? "entrada urgente" : "entradas urgentes"} {isToday ? "hoje" : "neste dia"}
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
                  {mode === "team" && stockOf.get(group.building) && (
                    <BuildingStockForm stock={stockOf.get(group.building)!} />
                  )}
                  {items.map((c) =>
                    mode === "admin" ? (
                      <DailyCleaningCard
                        key={c.id}
                        cleaning={c}
                        cleaners={cleaners}
                        photos={photos.get(c.id) ?? 0}
                        todos={todoCount.get(c.property_id) ?? 0}
                      />
                    ) : (
                      <TeamCleaningCard
                        key={c.id}
                        cleaning={c}
                        photos={photos.get(c.id) ?? 0}
                        todos={todoCount.get(c.property_id) ?? 0}
                      />
                    ),
                  )}
                </div>
              </BuildingAccordion>
            );
          })}
        </div>
      )}

      {mode === "admin" && (
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
      )}
    </div>
  );
}
