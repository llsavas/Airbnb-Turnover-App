"use client";

import { createContext, startTransition, use, useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui";
import type { FormState } from "@/lib/form";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext<boolean | null>(null);

// Form wired to a server action that reports errors back as FormState.
// Submits through onSubmit instead of the action prop so React doesn't reset
// the fields when the action returns an error.
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  confirm,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  confirm?: string;
}) {
  const formStatus = useFormStatus();
  const pending = use(PendingContext) ?? formStatus.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}

// Select that saves as soon as the value changes (e.g. assigning a cleaner).
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  placeholder,
  ariaLabel,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder: string;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      disabled={pending}
      aria-label={ariaLabel}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="w-full rounded-lg border-0 bg-white px-2 py-1.5 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:opacity-60 sm:w-48"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
