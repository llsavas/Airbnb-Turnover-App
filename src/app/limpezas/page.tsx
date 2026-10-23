import type { Metadata } from "next";
import Link from "next/link";
import { BuildingPicker } from "@/components/building-picker";
import { requireUser } from "@/lib/auth";
import { listBuildingCounts } from "@/lib/data";
import { isValidDate, isValidMonth, today } from "@/lib/dates";
import { DailyView } from "../admin/_painel/daily";
import { MonthlyView } from "../admin/_painel/monthly";

export const metadata: Metadata = { title: "Limpezas" };

const TABS = [
  { id: "diario", label: "Diário" },
  { id: "mensal", label: "Mensal" },
] as const;

// The team app: every cleaning of the buildings this person works in.
export default async function TeamCleaningsPage({ searchParams }: PageProps<"/limpezas">) {
  const profile = await requireUser();

  const params = await searchParams;
  const param = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const tab = param("aba") === "mensal" ? "mensal" : "diario";
  const date = isValidDate(param("dia")) ? param("dia") : today();
  const month = isValidMonth(param("mes")) ? param("mes") : date.slice(0, 7);

  const link = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ aba: tab, dia: date, mes: month, ...changes });
    return `/limpezas?${next}`;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <nav className="flex rounded-xl bg-surface p-1 ring-1 ring-slate-200">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={link({ aba: t.id })}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                tab === t.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <BuildingPicker buildings={await listBuildingCounts()} selected={profile.buildings} />
      </div>

      {tab === "diario" ? (
        <DailyView date={date} buildings={profile.buildings} link={link} mode="team" />
      ) : (
        <MonthlyView month={month} buildings={profile.buildings} link={link} />
      )}
    </div>
  );
}
