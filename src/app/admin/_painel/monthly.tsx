import Link from "next/link";
import { Card } from "@/components/ui";
import { inBuildings } from "@/lib/buildings";
import { listCleanings } from "@/lib/data";
import { addMonths, daysInMonth, formatMonth, today } from "@/lib/dates";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function MonthlyView({
  month,
  buildings,
  link,
}: {
  month: string;
  buildings: string[];
  link: (params: Record<string, string>) => string;
}) {
  const days = daysInMonth(month);
  const first = `${month}-01`;
  const last = `${month}-${String(days).padStart(2, "0")}`;
  const cleanings = (await listCleanings({ from: first, to: last })).filter(
    (c) => c.status !== "cancelled" && inBuildings(buildings, c.property?.building),
  );

  const perDay = new Map<string, { total: number; sameDay: number; done: number }>();
  for (const c of cleanings) {
    const entry = perDay.get(c.date) ?? { total: 0, sameDay: 0, done: 0 };
    entry.total++;
    if (c.next_checkin === c.date) entry.sameDay++;
    if (c.status === "completed") entry.done++;
    perDay.set(c.date, entry);
  }

  const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
  const todayDate = today();

  return (
    <div className="space-y-3">
      <Card className="flex items-center justify-between gap-2">
        <Link href={link({ mes: addMonths(month, -1) })} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Mês anterior">
          ‹
        </Link>
        <p className="text-lg font-bold capitalize">{formatMonth(month)}</p>
        <Link href={link({ mes: addMonths(month, 1) })} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Próximo mês">
          ›
        </Link>
      </Card>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 sm:gap-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const info = perDay.get(date);
          return (
            <Link
              key={date}
              href={link({ aba: "diario", dia: date })}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg bg-surface ring-1 transition hover:ring-brand-600 sm:rounded-xl ${
                date === todayDate ? "ring-2 ring-emerald-500" : "ring-slate-200"
              }`}
            >
              <span className={`text-sm sm:text-base ${date === todayDate ? "font-bold text-slate-900" : "text-slate-700"}`}>
                {i + 1}
              </span>
              {info && (
                <span
                  className={`min-w-6 rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    info.sameDay ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-slate-100 text-slate-600"
                  }`}
                  title={`${info.total} limpezas, ${info.sameDay} com entrada no mesmo dia, ${info.done} concluídas`}
                >
                  {info.total}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        O número indica quantas limpezas (checkouts) há no dia. Em vermelho: dias com entrada no mesmo dia.
        Toque num dia para ver a lista.
      </p>
    </div>
  );
}
