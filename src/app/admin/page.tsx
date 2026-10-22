import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { listCleaners, listCleanings, listIssues, listLowStock } from "@/lib/data";
import { addDays, formatDateTime, formatDay, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { CleaningWithRelations, SyncRun } from "@/lib/types";
import { syncNow } from "./actions";
import { CleaningRow } from "./limpezas/cleaning-row";

export const metadata: Metadata = { title: "Painel" };
// "Sincronizar agora" / "Importar do Hospitable" call the Hospitable API.
export const maxDuration = 60;

function Stat({ label, value, tone, href }: { label: string; value: number; tone?: string; href?: string }) {
  const card = (
    <Card className="h-full p-4 sm:p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function count(items: CleaningWithRelations[], status: string) {
  return items.filter((c) => c.status === status).length;
}

export default async function DashboardPage() {
  const day = today();
  const tomorrow = addDays(day, 1);
  const supabase = await createClient();
  const [cleanings, cleaners, openIssues, lowStock, { data: lastSync }] = await Promise.all([
    listCleanings({ from: day, to: tomorrow }),
    listCleaners(),
    listIssues("open"),
    listLowStock(),
    supabase
      .from("sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<SyncRun>(),
  ]);
  const urgentIssues = openIssues.filter((i) => i.urgency === "urgent").length;
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Limpezas hoje" value={todays.length} />
        <Stat label="Em andamento" value={count(todays, "in_progress")} tone="text-amber-700" />
        <Stat label="Concluídas" value={count(todays, "completed")} tone="text-emerald-700" />
        <Stat label="Sem responsável" value={unassigned.length} tone={unassigned.length ? "text-red-700" : undefined} />
        <Stat
          label={urgentIssues ? `Problemas (${urgentIssues} urgentes)` : "Problemas abertos"}
          value={openIssues.length}
          tone={urgentIssues ? "text-red-700" : openIssues.length ? "text-amber-700" : undefined}
          href="/admin/problemas"
        />
        <Stat
          label="Itens em falta"
          value={lowStock.length}
          tone={lowStock.length ? "text-amber-700" : undefined}
          href="/admin/estoque"
        />
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-semibold">Hospitable</p>
          <p className="text-slate-500">
            {!lastSync
              ? "Ainda não sincronizado."
              : lastSync.ok === false
                ? `Falhou em ${formatDateTime(lastSync.started_at)}: ${lastSync.message ?? ""}`
                : `Última sincronização: ${formatDateTime(lastSync.started_at)}`}
          </p>
        </div>
        <ActionForm action={syncNow}>
          <SubmitButton variant="secondary">Sincronizar agora</SubmitButton>
        </ActionForm>
      </Card>

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
