"use client";

import { useRef, useState, useTransition } from "react";
import { saveCleaningNotes } from "../limpezas/actions";

// Free-text notes for the cleaner, saved when the field loses focus or a
// moment after typing stops.
export function NotesBox({ cleaningId, initial }: { cleaningId: string; initial: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const saved = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function save(value: string) {
    clearTimeout(timer.current);
    if (value === saved.current) return;
    setStatus("saving");
    startTransition(async () => {
      const result = await saveCleaningNotes(cleaningId, value);
      if (result?.error) {
        setStatus("error");
      } else {
        saved.current = value;
        setStatus("saved");
      }
    });
  }

  return (
    <div className="relative">
      <textarea
        defaultValue={initial}
        rows={2}
        placeholder="Observação para a equipe de limpeza…"
        aria-label="Observação para a equipe de limpeza"
        onChange={(e) => {
          const value = e.currentTarget.value;
          clearTimeout(timer.current);
          setStatus("idle");
          timer.current = setTimeout(() => save(value), 1200);
        }}
        onBlur={(e) => save(e.currentTarget.value)}
        className="block w-full resize-y rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
      />
      {status !== "idle" && (
        <span
          className={`absolute right-2 bottom-1.5 text-[11px] ${status === "error" ? "text-red-700" : "text-slate-400"}`}
        >
          {status === "saving" ? "Salvando…" : status === "saved" ? "Salvo" : "Erro ao salvar"}
        </span>
      )}
    </div>
  );
}
