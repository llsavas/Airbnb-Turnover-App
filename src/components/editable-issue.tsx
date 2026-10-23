"use client";

import { useRef, useState, useTransition } from "react";
import { type IssuePhoto, updateIssue } from "@/app/limpezas/actions";
import { compressImage } from "@/lib/image";
import { ISSUE_TEAM_LABELS, type IssueTeam, type IssueUrgency } from "@/lib/types";

const MAX_PHOTOS = 4;
const URGENCIES: { id: IssueUrgency; label: string; on: string }[] = [
  { id: "low", label: "Pode esperar", on: "bg-slate-100 text-slate-700 ring-slate-400" },
  { id: "normal", label: "Normal", on: "bg-amber-50 text-amber-800 ring-amber-400" },
  { id: "urgent", label: "Urgente", on: "bg-red-50 text-red-700 ring-red-400" },
];

function chip(selected: boolean, on: string) {
  return `rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
    selected ? on : "text-slate-500 ring-slate-200 hover:bg-slate-100"
  }`;
}

// An open problem edited right on its card: tap the text to change it (saved
// when leaving the field), tap a chip to change urgency or team, add or remove
// photos. Every change saves by itself.
export function EditableIssue({
  issueId,
  description: initialDescription,
  urgency: initialUrgency,
  team: initialTeam,
  photos: initialPhotos,
  canChangeTeam,
}: {
  issueId: string;
  description: string;
  urgency: IssueUrgency;
  team: IssueTeam | null;
  photos: IssuePhoto[];
  canChangeTeam: boolean;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [saved, setSaved] = useState(initialDescription);
  const [urgency, setUrgency] = useState(initialUrgency);
  const [team, setTeam] = useState(initialTeam);
  const [photos, setPhotos] = useState(initialPhotos);
  const [status, setStatus] = useState<"saving" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function save(fields: Record<string, string>, files: File[] = [], after?: (photos?: IssuePhoto[]) => void) {
    setError(null);
    setStatus("saving");
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      for (const file of await Promise.all(files.map((f) => compressImage(f)))) formData.append("photos", file);
      const result = await updateIssue(issueId, formData);
      if (result.error) {
        setError(result.error);
        setStatus(null);
        return;
      }
      after?.(result.photos);
      setStatus("saved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus(null), 2000);
    });
  }

  function saveDescription() {
    const value = description.trim();
    if (value === saved) return;
    if (!value) {
      setDescription(saved);
      return setError("A descrição não pode ficar vazia.");
    }
    save({ description: value }, [], () => setSaved(value));
  }

  return (
    <div className="space-y-2">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        onBlur={saveDescription}
        rows={Math.max(1, Math.ceil(description.length / 45), description.split("\n").length)}
        aria-label="Descrição do problema"
        className="-mx-2 block w-[calc(100%+1rem)] resize-none rounded-lg border-0 bg-transparent px-2 py-1 text-[15px] text-slate-900 ring-1 ring-transparent hover:ring-slate-200 focus:bg-surface focus:ring-2 focus:ring-brand-600 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {URGENCIES.map((u) => (
          <button
            key={u.id}
            type="button"
            aria-pressed={urgency === u.id}
            onClick={() => {
              if (u.id === urgency) return;
              setUrgency(u.id);
              save({ urgency: u.id });
            }}
            className={chip(urgency === u.id, u.on)}
          >
            {u.label}
          </button>
        ))}
        {canChangeTeam && (
          <>
            <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
            {(Object.entries(ISSUE_TEAM_LABELS) as [IssueTeam, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={team === id}
                onClick={() => {
                  if (id === team) return;
                  setTeam(id);
                  save({ team: id });
                }}
                className={chip(team === id, "bg-brand-50 text-brand-700 ring-brand-600")}
              >
                {id === "maintenance" ? "🔧" : "🧽"} {label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.path} className="relative">
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
              <img src={p.url} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
            </a>
            <button
              type="button"
              aria-label={`Remover foto ${i + 1}`}
              onClick={() => {
                if (!confirm("Remover esta foto?")) return;
                const keep = photos.filter((x) => x !== p);
                setPhotos(keep);
                save({ keep_photos: JSON.stringify(keep.map((x) => x.path)) }, [], (next) => next && setPhotos(next));
              }}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-900 text-[11px] text-slate-50"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-medium text-slate-500 hover:bg-slate-100">
            <span className="text-lg" aria-hidden>
              📷
            </span>
            Foto
            {/* No "capture": the phone offers Take Photo / Photo Library / Choose File. */}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.currentTarget.files ?? [])].slice(0, MAX_PHOTOS - photos.length);
                e.currentTarget.value = "";
                if (files.length === 0) return;
                save(
                  { keep_photos: JSON.stringify(photos.map((x) => x.path)) },
                  files,
                  (next) => next && setPhotos(next),
                );
              }}
            />
          </label>
        )}
      </div>

      <p className="h-4 text-xs" aria-live="polite">
        {error ? (
          <span className="text-red-700">{error}</span>
        ) : status === "saving" ? (
          <span className="text-slate-500">Salvando…</span>
        ) : status === "saved" ? (
          <span className="text-emerald-700">✓ Salvo</span>
        ) : null}
      </p>
    </div>
  );
}
