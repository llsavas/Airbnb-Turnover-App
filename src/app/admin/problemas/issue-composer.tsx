"use client";

import { useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { compressImage } from "@/lib/image";
import type { IssueReading } from "@/lib/issue-reader";
import { ISSUE_TEAM_LABELS, type IssueTeam, type IssueUrgency, type Property } from "@/lib/types";
import { createIssue, readIssue } from "./actions";

type Apartment = Pick<Property, "id" | "name" | "building">;

const MAX_PHOTOS = 4;
const URGENCIES: { id: IssueUrgency; label: string; tone: string }[] = [
  { id: "low", label: "Pode esperar", tone: "ring-slate-400" },
  { id: "normal", label: "Normal", tone: "ring-amber-500" },
  { id: "urgent", label: "Urgente", tone: "ring-red-700" },
];
const field =
  "block w-full rounded-lg border-0 bg-surface px-3 py-2 text-base text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none sm:text-sm";

function choice(selected: boolean, tone = "ring-brand-600") {
  return `rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition ${
    selected ? `bg-slate-100 ring-2 ${tone}` : "bg-surface ring-slate-200 hover:bg-slate-100"
  }`;
}

// "215 Skyline gaveta solta" + optional photos (drag, camera or file). The
// text is read into building / apartment / description, confirmed on a card.
export function IssueComposer({ apartments }: { apartments: Apartment[] }) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<(IssueReading & { note: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const buildings = [...new Set(apartments.flatMap((a) => (a.building ? [a.building] : [])))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  function addPhotos(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    setPhotos((all) => [...all, ...images.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  }

  function read() {
    setError(null);
    setDone(false);
    startReading(async () => {
      const result = await readIssue(note);
      if ("error" in result) setError(result.error);
      else setDraft({ ...result, note });
    });
  }

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setNote("");
    setDraft(null);
    setError(null);
  }

  function save() {
    if (!draft) return;
    if (!draft.propertyId) return setError("Escolha o apartamento.");
    if (!draft.description.trim()) return setError("Descreva o problema.");
    setError(null);
    startSaving(async () => {
      const formData = new FormData();
      formData.set("property_id", draft.propertyId!);
      formData.set("description", draft.description);
      formData.set("team", draft.team);
      formData.set("urgency", draft.urgency);
      for (const photo of await Promise.all(photos.map((p) => compressImage(p.file)))) {
        formData.append("photos", photo);
      }
      const result = await createIssue(formData);
      if (result?.error) return setError(result.error);
      reset();
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    });
  }

  const inBuilding = apartments
    .filter((a) => !draft?.building || a.building === draft.building)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addPhotos([...e.dataTransfer.files]);
      }}
      className={`min-w-0 flex-1 space-y-3 rounded-xl transition ${dragging ? "bg-brand-50 ring-2 ring-brand-600" : ""}`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          read();
        }}
        className="flex gap-2"
      >
        <input
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          placeholder="Registrar problema. Ex.: 215 Skyline gaveta solta"
          aria-label="Registrar problema"
          className={`${field} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label="Adicionar foto"
          title="Adicionar foto (ou arraste aqui)"
          className="shrink-0 rounded-lg px-3 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          📷
        </button>
        {/* No "capture": the phone offers Take Photo / Photo Library / Choose File. */}
        <input
          ref={input}
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
        <button type="submit" disabled={reading || !note.trim()} className={buttonClass("primary", "shrink-0")}>
          {reading ? "Lendo…" : "Ler"}
        </button>
      </form>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
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
        </div>
      )}

      {done && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
          ✓ Problema registrado.
        </p>
      )}
      {error && !draft && <p className="text-sm text-red-700">{error}</p>}

      {draft && (
        <div className="space-y-3 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">
            {draft.propertyId ? "Confira antes de registrar" : "Não encontrei o apartamento. Escolha abaixo"}
            {draft.source === "ia" && " · lido pela IA"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Prédio</span>
              <select
                value={draft.building ?? ""}
                onChange={(e) => {
                  const building = e.currentTarget.value || null;
                  const current = apartments.find((a) => a.id === draft.propertyId);
                  setDraft({ ...draft, building, propertyId: current?.building === building ? draft.propertyId : null });
                }}
                className={field}
              >
                <option value="">Todos</option>
                {buildings.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Apto</span>
              <select
                value={draft.propertyId ?? ""}
                onChange={(e) => {
                  const apt = apartments.find((a) => a.id === e.currentTarget.value);
                  setDraft({ ...draft, propertyId: apt?.id ?? null, building: apt?.building ?? draft.building });
                }}
                className={`${field} ${draft.propertyId ? "" : "ring-2 ring-amber-500"}`}
              >
                <option value="">Escolha…</option>
                {inBuilding.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-600">Problema</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.currentTarget.value })}
              rows={2}
              className={field}
            />
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-600">Quem resolve</legend>
              <div className="flex gap-2">
                {(Object.entries(ISSUE_TEAM_LABELS) as [IssueTeam, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={draft.team === id}
                    onClick={() => setDraft({ ...draft, team: id })}
                    className={choice(draft.team === id)}
                  >
                    {id === "maintenance" ? "🔧" : "🧽"} {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-600">Urgência</legend>
              <div className="flex gap-2">
                {URGENCIES.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={draft.urgency === u.id}
                    onClick={() => setDraft({ ...draft, urgency: u.id })}
                    className={choice(draft.urgency === u.id, u.tone)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          {photos.length > 0 && <p className="text-xs text-slate-500">{photos.length} foto(s) junto</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className={buttonClass("primary", "flex-1")}>
              {saving ? "Registrando…" : "Registrar problema"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={buttonClass("secondary")}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
