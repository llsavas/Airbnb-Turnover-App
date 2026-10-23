"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteIssue } from "@/app/limpezas/actions";

// Red "Deletar": the first tap asks, the second (within a few seconds) deletes.
export function DeleteIssue({ issueId }: { issueId: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!armed) return setArmed(true);
          setError(null);
          startTransition(async () => {
            const result = await deleteIssue(issueId);
            if (result?.error) {
              setError(result.error);
              setArmed(false);
            }
          });
        }}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          armed ? "bg-red-700 text-white" : "text-red-700 ring-1 ring-red-300 hover:bg-red-50"
        }`}
      >
        {pending ? "Deletando…" : armed ? "Toque de novo para deletar" : "🗑 Deletar"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
