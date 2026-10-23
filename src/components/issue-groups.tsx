import type { ReactNode } from "react";
import { FlameIcon } from "@/components/ui";

// Collapsible block per building: "LBY (3)", closed by default, cards inside.
export function IssueBuildingGroup({
  building,
  count,
  urgent,
  children,
}: {
  building: string;
  count: number;
  urgent: number;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl bg-surface shadow-sm ring-1 ring-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold uppercase">{building}</span>
          <span className="text-slate-500 tabular-nums">({count})</span>
          {urgent > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
              <FlameIcon />
              {urgent} {urgent === 1 ? "urgente" : "urgentes"}
            </span>
          )}
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden>
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </summary>
      <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">{children}</div>
    </details>
  );
}
