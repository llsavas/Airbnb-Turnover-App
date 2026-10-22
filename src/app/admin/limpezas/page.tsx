import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Select, buttonClass } from "@/components/ui";
import { listCleaners, listCleanings } from "@/lib/data";
import { addDays, formatDay, formatShortDate, isValidDate, startOfWeek, today } from "@/lib/dates";
import { CleaningRow } from "./cleaning-row";

export const metadata: Metadata = { title: "Limpezas" };

export default async function CleaningsPage({ searchParams }: PageProps<"/admin/limpezas">) {
  const params = await searchParams;
  const semana = typeof params.semana === "string" ? params.semana : undefined;
  const pessoa = typeof params.pessoa === "string" ? params.pessoa : "";

  const weekStart = startOfWeek(isValidDate(semana) ? semana : today());
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [cleanings, cleaners] = await Promise.all([
    listCleanings({ from: weekStart, to: weekEnd, cleanerId: pessoa || undefined }),
    listCleaners(),
  ]);

  const link = (week: string) =>
    `/admin/limpezas?semana=${week}${pessoa ? `&pessoa=${pessoa}` : ""}`;
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
                <Card className="divide-y divide-slate-100 p-0 sm:p-0">
                  {items.map((c) => (
                    <CleaningRow key={c.id} cleaning={c} cleaners={cleaners} />
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
