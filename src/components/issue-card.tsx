"use client";

import { type ReactNode, useRef, useState, useTransition } from "react";
import { type IssuePhoto, updateIssue } from "@/app/limpezas/actions";
import { compressImage } from "@/lib/image";
import { ISSUE_TEAM_LABELS, type IssueTeam, type IssueUrgency } from "@/lib/types";

const MAX_PHOTOS = 4;
// A tap moves to the next one.
const URGENCY: Record<IssueUrgency, { label: string; dot: string; text: string; next: IssueUrgency }> = {
  normal: { label: "Normal", dot: "bg-amber-400", text: "text-amber-800", next: "urgent" },
  urgent: { label: "Urgente", dot: "bg-red-500", text: "text-red-700", next: "low" },
  low: { label: "Sem pressa", dot: "bg-slate-400", text: "text-slate-600", next: "normal" },
};
const TEAM_STYLE: Record<IssueTeam, string> = {
  maintenance: "bg-red-50 text-red-700 ring-red-300",
  cleaning: "bg-emerald-50 text-emerald-700 ring-emerald-300",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-5 w-5 transition ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="M7.3 5.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4-1.4L10.6 10 7.3 6.7a1 1 0 0 1 0-1.4z" />
    </svg>
  );
}

// Compact problem card: apartment, type and urgency chips (a tap switches
// them), the description (tap to edit) and the photo on the right. The arrow
// opens the photos and the actions passed as children (Resolver, Deletar…).
// Every change saves by itself. Resolved problems are read-only.
export function IssueCard({
  issueId,
  title,
  createdAt,
  description: initialDescription,
  urgency: initialUrgency,
  team: initialTeam,
  typeLabel,
  photos: initialPhotos,
  canChangeTeam,
  readOnly = false,
  note,
  children,
}: {
  issueId: string;
  title: string;
  // "23/10, 13:38"
  createdAt: string;
  description: string;
  urgency: IssueUrgency;
  team: IssueTeam | null;
  // Shown when the problem has no team (reported from a cleaning).
  typeLabel: string;
  photos: IssuePhoto[];
  canChangeTeam: boolean;
  readOnly?: boolean;
  // Small line under the description ("Resolvido em …").
  note?: ReactNode;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [saved, setSaved] = useState(initialDescription);
  const [urgency, setUrgency] = useState(initialUrgency);
  const [team, setTeam] = useState(initialTeam);
  const [photos, setPhotos] = useState(initialPhotos);
  const [status, setStatus] = useState<"saving" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const photoInput = useRef<HTMLInputElement>(null);

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

  function addPhotos(files: File[]) {
    const chosen = files.slice(0, MAX_PHOTOS - photos.length);
    if (chosen.length === 0) return;
    save({ keep_photos: JSON.stringify(photos.map((p) => p.path)) }, chosen, (next) => next && setPhotos(next));
  }

  const [day, time] = createdAt.split(", ");
  const u = URGENCY[urgency];
  const chipBase = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1";
  const typeChip = team ? (
    <>
      {team === "maintenance" ? "🔧" : "🧽"} {ISSUE_TEAM_LABELS[team]}
    </>
  ) : (
    typeLabel
  );

  return (
    <div className="rounded-xl bg-surface p-3 ring-1 ring-slate-200">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-bold">{title}</p>
            <p className="shrink-0 text-right text-[11px] leading-tight text-slate-500 tabular-nums">
              {day}
              {time && <span className="block">{time}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {canChangeTeam && !readOnly ? (
              <button
                type="button"
                title="Tocar para trocar quem resolve"
                onClick={() => {
                  const next: IssueTeam = team === "maintenance" ? "cleaning" : "maintenance";
                  setTeam(next);
                  save({ team: next });
                }}
                className={`${chipBase} ${team ? TEAM_STYLE[team] : "text-slate-600 ring-slate-300"}`}
              >
                {typeChip}
              </button>
            ) : (
              <span className={`${chipBase} ${team ? TEAM_STYLE[team] : "text-slate-600 ring-slate-300"}`}>{typeChip}</span>
            )}
            {readOnly ? (
              <span className={`${chipBase} ring-slate-200 ${u.text}`}>
                <span className={`h-2 w-2 rounded-full ${u.dot}`} aria-hidden /> {u.label}
              </span>
            ) : (
              <button
                type="button"
                title="Tocar para trocar a prioridade"
                onClick={() => {
                  setUrgency(u.next);
                  save({ urgency: u.next });
                }}
                className={`${chipBase} ring-slate-200 hover:bg-slate-100 ${u.text}`}
              >
                <span className={`h-2 w-2 rounded-full ${u.dot}`} aria-hidden /> {u.label}
              </button>
            )}
          </div>

          {readOnly ? (
            <p className="text-sm whitespace-pre-line text-slate-800">{description}</p>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              onBlur={saveDescription}
              rows={Math.max(1, Math.ceil(description.length / 38), description.split("\n").length)}
              aria-label="Descrição do problema"
              className="-mx-1.5 block w-[calc(100%+0.75rem)] resize-none rounded-md border-0 bg-transparent px-1.5 py-0.5 text-sm text-slate-800 ring-1 ring-transparent hover:ring-slate-200 focus:bg-surface focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          )}
          {note && <p className="text-xs text-emerald-700">{note}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          {photos[0] ? (
            <a href={photos[0].url} target="_blank" rel="noreferrer" className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
              <img src={photos[0].url} alt="Foto do problema" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
              {photos.length > 1 && (
                <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
                  +{photos.length - 1}
                </span>
              )}
            </a>
          ) : readOnly ? (
            <span className="h-16 w-16" />
          ) : (
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              aria-label="Adicionar foto"
              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
            >
              <span className="text-base" aria-hidden>
                📷
              </span>
              Foto
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fechar detalhes" : "Abrir detalhes"}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Chevron open={open} />
          </button>
        </div>
      </div>

      {/* No "capture": the phone offers Take Photo / Photo Library / Choose File. */}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addPhotos([...(e.currentTarget.files ?? [])]);
          e.currentTarget.value = "";
        }}
      />

      {(status || error) && (
        <p className="mt-1 text-xs" aria-live="polite">
          {error ? (
            <span className="text-red-700">{error}</span>
          ) : status === "saving" ? (
            <span className="text-slate-500">Salvando…</span>
          ) : (
            <span className="text-emerald-700">✓ Salvo</span>
          )}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.path} className="relative">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                    <img src={p.url} alt={`Foto ${i + 1}`} className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
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
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                >
                  <span aria-hidden>📷</span>+ Foto
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
