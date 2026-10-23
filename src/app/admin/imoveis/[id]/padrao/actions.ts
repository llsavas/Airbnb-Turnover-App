"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { FormError, int, requiredText, text, toFormState, type FormState } from "@/lib/form";
import { uploadReferencePhoto } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

function revalidateStandard(propertyId: string) {
  revalidatePath(`/admin/imoveis/${propertyId}/padrao`);
  revalidatePath("/limpezas", "layout");
}

export async function saveStandardNotes(propertyId: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("property_standards")
      .upsert({ property_id: propertyId, notes: text(formData, "notes") });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateStandard(propertyId);
  return { success: "Notas salvas." };
}

export async function addLinen(propertyId: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const quantity = int(formData, "quantity") ?? 1;
    if (quantity < 0) throw new FormError("Quantidade inválida.");
    const supabase = await createClient();
    const { count } = await supabase
      .from("property_linens")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);
    const { error } = await supabase.from("property_linens").insert({
      property_id: propertyId,
      item: requiredText(formData, "item", "Item"),
      quantity,
      position: ((count ?? 0) + 1) * 10,
    });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateStandard(propertyId);
  return null;
}

export async function updateLinenQuantity(propertyId: string, id: string, quantity: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_linens")
    .update({ quantity: Math.max(0, quantity) })
    .eq("id", id);
  if (error) throw error;
  revalidateStandard(propertyId);
}

export async function deleteLinen(propertyId: string, id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("property_linens").delete().eq("id", id);
  if (error) throw error;
  revalidateStandard(propertyId);
}

export async function addReferencePhotos(propertyId: string, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new FormError("Escolha pelo menos uma foto.");
    const caption = text(formData, "caption");
    const supabase = await createClient();
    const { count } = await supabase
      .from("property_reference_photos")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);
    const paths = await Promise.all(files.map((f) => uploadReferencePhoto(propertyId, f)));
    const { error } = await supabase.from("property_reference_photos").insert(
      paths.map((path, i) => ({ property_id: propertyId, path, caption, position: ((count ?? 0) + i + 1) * 10 })),
    );
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateStandard(propertyId);
  return null;
}

export async function deleteReferencePhoto(propertyId: string, id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: photo, error } = await supabase
    .from("property_reference_photos")
    .delete()
    .eq("id", id)
    .select("path")
    .single();
  if (error) throw error;
  // The file stays if another apartment copied this photo.
  const { count } = await supabase
    .from("property_reference_photos")
    .select("*", { count: "exact", head: true })
    .eq("path", photo.path);
  if (!count) await supabase.storage.from("photos").remove([photo.path]);
  revalidateStandard(propertyId);
}

// "Copiar padrão de outro apartamento": replaces notes, linens, reference
// photos and the apartment's own checklist items with the other one's.
export async function copyStandard(propertyId: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const sourceId = requiredText(formData, "source_id", "Apartamento");
    if (sourceId === propertyId) throw new FormError("Escolha outro apartamento.");
    const supabase = await createClient();
    const [{ data: standard }, { data: linens }, { data: photos }, { data: items }] = await Promise.all([
      supabase.from("property_standards").select("notes").eq("property_id", sourceId).maybeSingle(),
      supabase.from("property_linens").select("item, quantity, position").eq("property_id", sourceId),
      supabase.from("property_reference_photos").select("path, caption, position").eq("property_id", sourceId),
      supabase
        .from("checklist_items")
        .select("room, label, tip, requires_photo, position, active")
        .eq("property_id", sourceId),
    ]);

    const steps = [
      supabase.from("property_standards").upsert({ property_id: propertyId, notes: standard?.notes ?? null }),
      supabase.from("property_linens").delete().eq("property_id", propertyId),
      supabase.from("property_reference_photos").delete().eq("property_id", propertyId),
      supabase.from("checklist_items").delete().eq("property_id", propertyId),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw error;
    }
    const inserts = [
      linens?.length && supabase.from("property_linens").insert(linens.map((l) => ({ ...l, property_id: propertyId }))),
      // Photos are shared: both apartments point to the same files.
      photos?.length &&
        supabase.from("property_reference_photos").insert(photos.map((p) => ({ ...p, property_id: propertyId }))),
      items?.length && supabase.from("checklist_items").insert(items.map((i) => ({ ...i, property_id: propertyId }))),
    ];
    for (const insert of inserts) {
      if (!insert) continue;
      const { error } = await insert;
      if (error) throw error;
    }
  } catch (error) {
    return toFormState(error);
  }
  revalidateStandard(propertyId);
  revalidatePath("/admin/checklist");
  return { success: "Padrão copiado." };
}
