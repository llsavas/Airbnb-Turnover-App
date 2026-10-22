"use client";

import { useState, useTransition } from "react";
import { Field, Select, Textarea, buttonClass } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { compressImage } from "@/lib/image";
import { ISSUE_CATEGORY_LABELS, ISSUE_URGENCY_LABELS } from "@/lib/types";
import { reportIssue } from "../actions";

export function IssueForm({ cleaningId }: { cleaningId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();
  const [photoCount, setPhotoCount] = useState(0);

  if (!open) {
    return (
      <div>
        {state?.success && (
          <p role="status" className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.success}
          </p>
        )}
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger", "w-full py-3")}>
          ⚠ Reportar problema
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-red-200"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        startTransition(async () => {
          // Shrink photos on the phone before sending them.
          const formData = new FormData(form);
          const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
          formData.delete("photos");
          for (const photo of await Promise.all(photos.map((p) => compressImage(p)))) {
            formData.append("photos", photo);
          }
          const result = await reportIssue(cleaningId, null, formData);
          setState(result);
          if (result?.success) {
            form.reset();
            setPhotoCount(0);
            setOpen(false);
          }
        });
      }}
    >
      <h3 className="font-semibold text-red-700">Reportar problema</h3>
      <Field label="Tipo">
        <Select name="category" defaultValue="damage" required>
          {Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Urgência">
        <Select name="urgency" defaultValue="normal" required>
          {Object.entries(ISSUE_URGENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="O que aconteceu?">
        <Textarea name="description" required placeholder="Ex.: Vidro do box trincado, chuveiro sem água quente…" />
      </Field>
      <Field label="Fotos (até 4)">
        <input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          onChange={(e) => setPhotoCount(e.currentTarget.files?.length ?? 0)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"
        />
        {photoCount > 0 && <span className="mt-1 block text-xs text-slate-500">{photoCount} foto(s) selecionada(s)</span>}
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "flex-1")}>
          {pending ? "Enviando…" : "Enviar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
