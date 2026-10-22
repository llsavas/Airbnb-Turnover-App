import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { listCleaners, listCleanings } from "@/lib/data";
import { addDays, formatDay, today } from "@/lib/dates";
import type { CleaningWithRelations } from "@/lib/types";
import { CleaningRow } from "./limpezas/cleaning-row";

export const metadata: Metadata = { title: "Painel" };

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </Card>
  );
}

function count(items: CleaningWithRelations[], status: string) {
  return items.filter((c) => c.status === status).length;
}

export default async function DashboardPage() {
  const day = today();
  const tomorrow = addDays(day, 1);
  const [cleanings, cleaners] = await Promise.all([
    listCleanings({ from: day, to: tomorrow }),
    listCleaners(),
  ]);
  const todays = cleanings.filter((c) => c.date === day && c.status !== "cancelled");
  const tomorrows = cleanings.filter((c) => c.date === tomorrow && c.status !== "cancelled");
  const unassigned = [...todays, ...tomorrows].filter((c) => !c.cleaner_id && c.status === "scheduled");

  return (
    <>
      <PageHeader title="Painel">
        <Link href="/admin/limpezas/nova" className={buttonClass()}>
          Nova limpeza
        </Link>
      </PageHeader>

      <p className="mb-3 text-sm font-medium text-slate-500 capitalize">{formatDay(day)}</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Limpezas hoje" value={todays.length} />
        <Stat label="Em andamento" value={count(todays, "in_progress")} tone="text-amber-700" />
        <Stat label="Concluídas" value={count(todays, "completed")} tone="text-emerald-700" />
        <Stat label="Sem responsável" value={unassigned.length} tone={unassigned.length ? "text-red-700" : undefined} />
      </div>

      {unassigned.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold text-red-700">Precisam de responsável (hoje e amanhã)</h2>
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {unassigned.map((c) => (
              <CleaningRow key={c.id} cleaning={c} cleaners={cleaners} />
            ))}
          </Card>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Hoje</h2>
        {todays.length === 0 ? (
          <EmptyState>Nenhuma limpeza hoje.</EmptyState>
        ) : (
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {todays.map((c) => (
              <CleaningRow key={c.id} cleaning={c} cleaners={cleaners} />
            ))}
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Amanhã</h2>
        {tomorrows.length === 0 ? (
          <EmptyState>Nenhuma limpeza amanhã.</EmptyState>
        ) : (
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {tomorrows.map((c) => (
              <CleaningRow key={c.id} cleaning={c} cleaners={cleaners} />
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
