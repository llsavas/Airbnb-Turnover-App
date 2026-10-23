"use client";

import { useEffect, useState, useTransition } from "react";
import { compressImage } from "@/lib/image";
import { ISSUE_CATEGORY_LABELS, type IssueCategory, type IssueUrgency } from "@/lib/types";
import { reportIssue } from "../actions";

const URGENCIES: { id: IssueUrgency; label: string; hint: string; tone: string }[] = [
  { id: "low", label: "Pode esperar", hint: "sem pressa", tone: "ring-slate-300" },
  { id: "normal", label: "Normal", hint: "nos próximos dias", tone: "ring-amber-500" },
  { id: "urgent", label: "Urgente", hint: "antes do próximo hóspede", tone: "ring-red-700" },
];
const MAX_PHOTOS = 4;

function choiceClass(selected: boolean, tone = "ring-brand-600") {
  return `rounded-xl px-3 py-3 text-left text-sm font-semibold ring-1 transition ${
    selected ? `bg-slate-100 ring-2 ${tone}` : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
  }`;
}

// (+) floating button that opens a quick "report a problem" sheet: big
// buttons for the type and urgency, a description and the phone's camera.
export function IssueSheet({ cleaningId }: { cleaningId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [urgency, setUrgency] = useState<IssueUrgency>("normal");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [open]);

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setCategory(null);
    setUrgency("normal");
    setDescription("");
    setPhotos([]);
    setError(null);
  }

  function submit() {
    if (!category) return setError("Escolha o tipo de problema.");
    if (!description.trim()) return setError("Conte em poucas palavras o que aconteceu.");
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("urgency", urgency);
      formData.set("description", description);
      for (const photo of await Promise.all(photos.map((p) => compressImage(p.file)))) {
        formData.append("photos", photo);
      }
      const result = await reportIssue(cleaningId, null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        reset();
        setOpen(false);
        setSent(true);
        setTimeout(() => setSent(false), 4000);
      }
    });
  }

  return (
    <>
      {sent && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 shadow-lg ring-1 ring-emerald-200"
        >
          Problema enviado. A gestão já foi avisada.
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Reportar problema"
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-700 text-3xl leading-none font-light text-slate-50 shadow-xl hover:brightness-110"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-t-2xl bg-surface p-5 ring-1 ring-slate-300 sm:rounded-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <div className="flex items-center justify-between">
              <h2 id="issue-title" className="text-lg font-bold">
                Reportar problema
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="text-2xl text-slate-500">
                ×
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-600">O que é?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ISSUE_CATEGORY_LABELS) as [IssueCategory, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={category === id}
                    onClick={() => setCategory(id)}
                    className={choiceClass(category === id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-600">Urgência</legend>
              <div className="grid grid-cols-3 gap-2">
                {URGENCIES.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={urgency === u.id}
                    onClick={() => setUrgency(u.id)}
                    className={choiceClass(urgency === u.id, u.tone)}
                  >
                    {u.label}
                    <span className="block text-[11px] font-normal text-slate-500">{u.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">O que aconteceu?</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                rows={3}
                placeholder="Ex.: Vidro do box trincado"
                className="block w-full rounded-lg border-0 bg-slate-50 px-3 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </label>

            <div>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img src={p.url} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                    <button
                      type="button"
                      aria-label={`Remover foto ${i + 1}`}
                      onClick={() => {
                        URL.revokeObjectURL(p.url);
                        setPhotos((all) => all.filter((x) => x !== p));
                      }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-900 text-xs text-slate-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    <span className="text-2xl" aria-hidden>
                      📷
                    </span>
                    Tirar foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) setPhotos((all) => [...all, { file, url: URL.createObjectURL(file) }]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="w-full rounded-xl bg-red-700 py-4 text-base font-semibold text-slate-50 disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Enviar problema"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
