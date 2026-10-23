import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { groupByBuilding } from "@/lib/buildings";
import { listProperties } from "@/lib/data";
import { signedPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import type { PropertyLinen, ReferencePhoto } from "@/lib/types";
import {
  addLinen,
  copyStandard,
  deleteLinen,
  deleteReferencePhoto,
  saveStandardNotes,
  updateLinenQuantity,
} from "./actions";
import { PhotoUploader } from "./photo-uploader";

export const metadata: Metadata = { title: "Padrão do apartamento" };
// Reference photo uploads.
export const maxDuration = 60;

export default async function StandardPage({ params }: PageProps<"/admin/imoveis/[id]/padrao">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: property }, { data: standard }, { data: linenRows }, { data: photoRows }, { count: ownItems }, properties] =
    await Promise.all([
      supabase.from("properties").select("id, name, building").eq("id", id).maybeSingle(),
      supabase.from("property_standards").select("notes").eq("property_id", id).maybeSingle(),
      supabase.from("property_linens").select("*").eq("property_id", id).order("position"),
      supabase.from("property_reference_photos").select("*").eq("property_id", id).order("position"),
      supabase.from("checklist_items").select("*", { count: "exact", head: true }).eq("property_id", id),
      listProperties(),
    ]);
  if (!property) notFound();
  const linens = (linenRows ?? []) as PropertyLinen[];
  const photos = (photoRows ?? []) as ReferencePhoto[];
  const urls = await signedPhotoUrls(photos.map((p) => p.path));

  return (
    <>
      <PageHeader title={`Padrão: ${property.name}`}>
        <Link href={`/admin/imoveis/${id}`} className={buttonClass("secondary")}>
          Dados do imóvel
        </Link>
      </PageHeader>
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Como este apartamento deve ficar depois da limpeza. A equipe vê tudo isto na tela da limpeza, em
        &quot;Padrão deste apartamento&quot;.
      </p>

      <div className="grid max-w-5xl gap-5 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Notas e instruções</h2>
          <ActionForm action={saveStandardNotes.bind(null, id)} className="space-y-3">
            <Textarea
              name="notes"
              rows={6}
              defaultValue={standard?.notes ?? ""}
              placeholder="Ex.: Wi-Fi na etiqueta da TV. Sofá-cama arrumado só para 3+ hóspedes. Café: deixar 2 cápsulas de cada sabor."
            />
            <SubmitButton>Salvar notas</SubmitButton>
          </ActionForm>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Enxoval e amenities</h2>
          {linens.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum item ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {linens.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{l.item}</span>
                  <div className="flex items-center gap-1">
                    <form action={updateLinenQuantity.bind(null, id, l.id, l.quantity - 1)}>
                      <button className="h-8 w-8 rounded-lg ring-1 ring-slate-300 hover:bg-slate-100" aria-label="Menos">
                        −
                      </button>
                    </form>
                    <span className="w-8 text-center font-semibold tabular-nums">{l.quantity}</span>
                    <form action={updateLinenQuantity.bind(null, id, l.id, l.quantity + 1)}>
                      <button className="h-8 w-8 rounded-lg ring-1 ring-slate-300 hover:bg-slate-100" aria-label="Mais">
                        +
                      </button>
                    </form>
                    <form action={deleteLinen.bind(null, id, l.id)}>
                      <button className="ml-2 h-8 w-8 rounded-lg text-red-700 hover:bg-red-50" aria-label={`Remover ${l.item}`}>
                        ×
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addLinen.bind(null, id)} className="flex items-end gap-2 border-t border-slate-100 pt-3">
            <div className="min-w-0 flex-1">
              <Field label="Item">
                <Input name="item" required placeholder="Ex.: Toalha de banho" />
              </Field>
            </div>
            <div className="w-20">
              <Field label="Qtd.">
                <Input name="quantity" type="number" min={0} defaultValue={1} />
              </Field>
            </div>
            <SubmitButton>Adicionar</SubmitButton>
          </ActionForm>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Fotos de referência</h2>
          <p className="text-sm text-slate-500">Cama arrumada, bancada, amenities: como deve ficar.</p>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <figure key={p.id} className="space-y-1">
                  {urls.get(p.path) && (
                    <a href={urls.get(p.path)} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                      <img src={urls.get(p.path)} alt={p.caption ?? ""} className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200" />
                    </a>
                  )}
                  <figcaption className="flex items-start justify-between gap-2 text-xs text-slate-600">
                    <span>{p.caption}</span>
                    <form action={deleteReferencePhoto.bind(null, id, p.id)}>
                      <button className="text-red-700">Excluir</button>
                    </form>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <PhotoUploader propertyId={id} />
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Checklist deste apartamento</h2>
          <p className="text-sm text-slate-500">
            O checklist padrão vale para todos. {ownItems ? `Este apartamento tem ${ownItems} item(ns) extra(s).` : "Este apartamento não tem itens extras."}
          </p>
          <Link href={`/admin/checklist?imovel=${id}`} className={buttonClass("secondary")}>
            Editar itens extras
          </Link>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Copiar padrão de outro apartamento</h2>
          <p className="text-sm text-slate-500">
            Substitui as notas, o enxoval, as fotos e os itens extras do checklist deste apartamento pelos do
            escolhido.
          </p>
          <ActionForm action={copyStandard.bind(null, id)} className="space-y-3">
            <Select name="source_id" required defaultValue="">
              <option value="">Escolha o apartamento…</option>
              {groupByBuilding(
                properties.filter((p) => p.id !== id),
                (p) => p.building,
              ).map((g) => (
                <optgroup key={g.building} label={g.building}>
                  {g.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <SubmitButton variant="secondary" confirm="Substituir o padrão deste apartamento?">
              Copiar padrão
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
