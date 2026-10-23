import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, PageHeader, buttonClass } from "@/components/ui";
import { BuildingPicker } from "@/components/building-picker";
import { DayViewSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/auth";
import { listBuildingCounts, listCleanings, listIssues, listLowStock } from "@/lib/data";
import { addDays, formatDateTime, isValidDate, isValidMonth, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { SyncRun } from "@/lib/types";
import { CheckinsView } from "./_painel/checkins";
import { DailyView } from "./_painel/daily";
import { MonthlyView } from "./_painel/monthly";
import { syncNow } from "./actions";

export const metadata: Metadata = { title: "Painel" };
// Syncing calls the Hospitable API and, for check-ins, the AI.
export const maxDuration = 300;

const TABS = [
  { id: "diario", label: "Diário" },
  { id: "mensal", label: "Mensal" },
  { id: "checkins", label: "Check-ins" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Alert({ href, count, label, tone }: { href: string; count: number; label: string; tone: string }) {
  if (count === 0) return null;
  return (
    <Link href={href} className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${tone}`}>
      {count} {label}
    </Link>
  );
}

// The page shell renders at once; these parts stream in as their data arrives.
async function Alerts() {
  const [openIssues, lowStock, upcoming] = await Promise.all([
    listIssues("open"),
    listLowStock(),
    listCleanings({ from: today(), to: addDays(today(), 1), cleanerId: "none" }),
  ]);
  const urgentIssues = openIssues.filter((i) => i.urgency === "urgent").length;
  const unassigned = upcoming.filter((c) => c.status === "scheduled").length;
  return (
    <div className="mb-4 flex min-h-7 flex-wrap gap-2">
      <Alert
        href="/admin/limpezas?pessoa=none"
        count={unassigned}
        label="sem responsável (hoje e amanhã)"
        tone="bg-red-50 text-red-700 ring-red-200"
      />
      <Alert
        href="/admin/problemas"
        count={openIssues.length}
        label={urgentIssues ? `problemas (${urgentIssues} urgentes)` : "problemas abertos"}
        tone={urgentIssues ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-800 ring-amber-200"}
      />
      <Alert
        href="/admin/estoque"
        count={lowStock.length}
        label="itens em falta"
        tone="bg-amber-50 text-amber-800 ring-amber-200"
      />
    </div>
  );
}

async function Picker({ selected }: { selected: string[] }) {
  return <BuildingPicker buildings={await listBuildingCounts()} selected={selected} />;
}

async function SyncCard() {
  const supabase = await createClient();
  const { data: lastSync } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<SyncRun>();
  return (
    <Card className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const param = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const tab: Tab = TABS.some((t) => t.id === param("aba")) ? (param("aba") as Tab) : "diario";
  // The admin's own building selection (shared with the Equipe mode).
  const profile = await requireAdmin();
  const buildings = profile.buildings;
  const date = isValidDate(param("dia")) ? param("dia") : today();
  const month = isValidMonth(param("mes")) ? param("mes") : date.slice(0, 7);

  // Keeps the current tab, building and date when switching any one of them.
  const link = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ aba: tab, dia: date, mes: month, ...changes });
    for (const [k, v] of [...next.entries()]) if (!v) next.delete(k);
    return `/admin?${next}`;
  };

  return (
    <>
      <PageHeader title="Painel">
        <Link href="/admin/limpezas/nova" className={buttonClass()}>
          Nova limpeza
        </Link>
      </PageHeader>

      <Suspense fallback={<div className="mb-4 h-7" />}>
        <Alerts />
      </Suspense>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex rounded-xl bg-surface p-1 ring-1 ring-slate-200">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={link({ aba: t.id })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium sm:px-4 ${
                tab === t.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <Suspense fallback={<div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />}>
          <Picker selected={buildings} />
        </Suspense>
      </div>

      {/* Keyed by what's shown, so switching tab or day shows the skeleton. */}
      <Suspense key={`${tab}|${date}|${month}`} fallback={<DayViewSkeleton />}>
        {tab === "diario" && <DailyView date={date} buildings={buildings} link={link} mode="admin" />}
        {tab === "mensal" && <MonthlyView month={month} buildings={buildings} link={link} />}
        {tab === "checkins" && <CheckinsView buildings={buildings} />}
      </Suspense>

      <Suspense fallback={null}>
        <SyncCard />
      </Suspense>
    </>
  );
}
