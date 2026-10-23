"use client";

import { useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { compressImage } from "@/lib/image";
import { addReferencePhotos } from "./actions";

export function PhotoUploader({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
          formData.delete("photos");
          for (const photo of await Promise.all(photos.map((p) => compressImage(p)))) formData.append("photos", photo);
          const result = await addReferencePhotos(propertyId, formData);
          if (result?.error) setError(result.error);
          else form.current?.reset();
        });
      }}
    >
      <input
        type="file"
        name="photos"
        accept="image/*"
        multiple
        required
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold sm:w-auto"
      />
      <input
        name="caption"
        placeholder="Legenda (opcional), ex.: cama arrumada"
        className="min-w-0 flex-1 rounded-lg border-0 bg-surface px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
      />
      <button disabled={pending} className={buttonClass("primary")}>
        {pending ? "Enviando…" : "Enviar fotos"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
