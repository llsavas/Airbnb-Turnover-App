import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Select, buttonClass } from "@/components/ui";
import { NO_BUILDING, buildingNames, groupByBuilding } from "@/lib/buildings";
import { listCleaners, listCleanings, listProperties } from "@/lib/data";
import { addDays, formatDay, formatShortDate, isValidDate, startOfWeek, today } from "@/lib/dates";
import { CleaningRow } from "./cleaning-row";

export const metadata: Metadata = { title: "Limpezas" };

export default async function CleaningsPage({ searchParams }: PageProps<"/admin/limpezas">) {
  const params = await searchParams;
  const semana = typeof params.semana === "string" ? params.semana : undefined;
  const pessoa = typeof params.pessoa === "string" ? params.pessoa : "";
  const predio = typeof params.predio === "string" ? params.predio : "";

  const weekStart = startOfWeek(isValidDate(semana) ? semana : today());
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [allCleanings, cleaners, properties] = await Promise.all([
    listCleanings({ from: weekStart, to: weekEnd, cleanerId: pessoa || undefined }),
    listCleaners(),
    listProperties(),
  ]);
  const cleanings = predio
    ? allCleanings.filter((c) => (c.property?.building ?? NO_BUILDING) === predio)
    : allCleanings;

  const link = (week: string) =>
    `/admin/limpezas?semana=${week}${pessoa ? `&pessoa=${pessoa}` : ""}${predio ? `&predio=${encodeURIComponent(predio)}` : ""}`;
  const unassigned = cleanings.filter((c) => !c.cleaner_id && c.status === "scheduled").length;

  return (
    <>
      <PageHeader title="Limpezas">
        <Link href="/admin/limpezas/nova" className={buttonClass()}>
          Nova limpeza
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Link href={link(addDays(weekStart, -7))} className={buttonClass("secondary", "px-3")} aria-label="Semana anterior">
            ←
          </Link>
          <Link href={link(startOfWeek(today()))} className={buttonClass("secondary")}>
            Esta semana
          </Link>
          <Link href={link(addDays(weekStart, 7))} className={buttonClass("secondary", "px-3")} aria-label="Próxima semana">
            →
          </Link>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {formatShortDate(weekStart)} a {formatShortDate(weekEnd)}
        </span>
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="semana" value={weekStart} />
          <Select name="pessoa" defaultValue={pessoa} className="w-auto">
            <option value="">Toda a equipe</option>
            <option value="none">Sem responsável</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
          <Select name="predio" defaultValue={predio} className="w-auto">
            <option value="">Todos os prédios</option>
            {[...buildingNames(properties), NO_BUILDING].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Filtrar</button>
        </form>
      </div>

      {unassigned > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          {unassigned} {unassigned === 1 ? "limpeza sem responsável" : "limpezas sem responsável"} nesta
          semana.
        </p>
      )}

      <div className="space-y-4">
        {days.map((day) => {
          const items = cleanings.filter((c) => c.date === day);
          return (
            <section key={day}>
              <h2
                className={`mb-2 text-sm font-semibold capitalize ${
                  day === today() ? "text-brand-700" : "text-slate-700"
                }`}
              >
                {formatDay(day)}
                {day === today() && " · hoje"}
                <span className="ml-2 font-normal text-slate-400">{items.length}</span>
              </h2>
              {items.length === 0 ? (
                <p className="px-1 text-sm text-slate-400">Nenhuma limpeza.</p>
              ) : (
                <Card className="p-0 sm:p-0">
                  {groupByBuilding(items, (c) => c.property?.building).map((group) => (
                    <div key={group.building}>
                      <p className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase first:rounded-t-xl">
                        {group.building} · {group.items.length}
                      </p>
                      <div className="divide-y divide-slate-100">
                        {group.items.map((c) => (
                          <CleaningRow key={c.id} cleaning={c} cleaners={cleaners} />
                        ))}
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
