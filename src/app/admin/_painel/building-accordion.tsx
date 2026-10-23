import type { ReactNode } from "react";

// Collapsible block per building with a progress bar ("3/5 concluídas").
export function BuildingAccordion({
  building,
  done,
  total,
  doneLabel,
  badge,
  children,
}: {
  building: string;
  done: number;
  total: number;
  doneLabel: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl bg-surface shadow-sm ring-1 ring-slate-200">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold uppercase">{building}</span>
            {badge}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
            <span className="tabular-nums">
              {done}/{total} {doneLabel}
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 transition group-open:rotate-180"
              aria-hidden
            >
              <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
            </svg>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </summary>
      <div className="border-t border-slate-100">{children}</div>
    </details>
  );
}

export function UrgentBadge({ count, singular, plural }: { count: number; singular: string; plural: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
      <FlameIcon />
      {count} {count === 1 ? singular : plural}
    </span>
  );
}

export function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.5 3-.5-3 0-5.5.5-8.5z" />
    </svg>
  );
}
