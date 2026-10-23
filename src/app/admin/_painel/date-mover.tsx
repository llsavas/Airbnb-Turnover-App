"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { moveCleaningDate } from "../limpezas/actions";

// "Editar data de limpeza" opens a small date picker; picking a day moves the
// cleaning there.
export function DateMover({ cleaningId, date }: { cleaningId: string; date: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={buttonClass("secondary", "px-3 py-1.5 text-xs")}
      >
        {pending ? "Salvando…" : "Editar data de limpeza"}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl bg-surface p-3 shadow-lg ring-1 ring-slate-300">
          <label className="block text-xs font-medium text-slate-600">
            Transferir limpeza para
            <input
              type="date"
              defaultValue={date}
              autoFocus
              onChange={(e) => {
                const value = e.currentTarget.value;
                if (!value || value === date) return;
                setError(null);
                startTransition(async () => {
                  const result = await moveCleaningDate(cleaningId, value);
                  if (result?.error) setError(result.error);
                  else setOpen(false);
                });
              }}
              className="mt-1 block w-full rounded-lg border-0 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </label>
          {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
          <button type="button" onClick={() => setOpen(false)} className="mt-2 text-xs text-slate-500">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
