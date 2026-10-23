"use client";

import { useState, useTransition } from "react";
import { resolveIssueWithPhotos } from "@/app/limpezas/actions";
import { buttonClass } from "@/components/ui";
import { compressImage } from "@/lib/image";

const MAX_PHOTOS = 2;

// "Resolver": optional note and "after" photo (camera or library), so the
// problem shows before (report) and after (resolved).
export function ResolveIssue({ issueId, cleaningId }: { issueId: string; cleaningId: string | null }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "py-2")}>
        ✓ Resolver
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <textarea
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        rows={2}
        placeholder="O que foi feito? (opcional)"
        className="block w-full rounded-lg border-0 bg-surface px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
      />
      {cleaningId && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt={`Foto de resolvido ${i + 1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
              <button
                type="button"
                aria-label={`Remover foto ${i + 1}`}
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  setPhotos((all) => all.filter((x) => x !== p));
                }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-900 text-[11px] text-slate-50"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-16 cursor-pointer items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
              📷 Foto de resolvido <span className="text-slate-400">(opcional)</span>
              {/* No "capture": the phone offers Take Photo / Photo Library / Choose File. */}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.currentTarget.files ?? [])];
                  setPhotos((all) =>
                    [...all, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS),
                  );
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const formData = new FormData();
              formData.set("resolution", note);
              for (const photo of await Promise.all(photos.map((p) => compressImage(p.file)))) {
                formData.append("photos", photo);
              }
              const result = await resolveIssueWithPhotos(issueId, cleaningId, formData);
              if (result?.error) setError(result.error);
              else photos.forEach((p) => URL.revokeObjectURL(p.url));
            })
          }
          className={buttonClass("primary", "flex-1")}
        >
          {pending ? "Enviando…" : "Marcar resolvido"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
