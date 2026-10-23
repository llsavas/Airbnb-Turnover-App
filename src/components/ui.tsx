import type { ComponentProps, ReactNode } from "react";
import type { CleaningStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "bg-surface text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50",
  danger: "bg-surface text-red-700 ring-1 ring-red-300 hover:bg-red-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  // "Iniciar limpeza": dark text on teal.
  go: "bg-teal-400 text-slate-50 hover:bg-teal-300",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
    buttonVariants[variant],
    extra,
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-xl bg-surface p-4 shadow-sm ring-1 ring-slate-200 sm:p-5", className)}
      {...props}
    />
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-lg border-0 bg-surface px-3 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(inputClass, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, className)} rows={3} {...props} />;
}

// Pendente red, Iniciado yellow, Concluído green.
const statusStyles: Record<CleaningStatus, string> = {
  scheduled: "bg-red-50 text-red-700 ring-red-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function StatusBadge({ status }: { status: CleaningStatus }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

// Marks same-day check-ins ("entrada no mesmo dia").
export function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.5 3-.5-3 0-5.5.5-8.5z" />
    </svg>
  );
}
