"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { int, requiredText, text, toFormState, type FormState } from "@/lib/form";

function itemFromForm(formData: FormData) {
  return {
    room: requiredText(formData, "room", "Cômodo"),
    label: requiredText(formData, "label", "Tarefa"),
    tip: text(formData, "tip"),
    requires_photo: formData.get("requires_photo") === "on",
    position: int(formData, "position") ?? 0,
  };
}

function backTo(propertyId: string | null) {
  return propertyId ? `/admin/checklist?imovel=${propertyId}` : "/admin/checklist";
}

export async function createChecklistItem(
  propertyId: string | null,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("checklist_items")
      .insert({ ...itemFromForm(formData), property_id: propertyId });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/checklist");
  return { success: "Item adicionado. Vale para as próximas limpezas iniciadas." };
}

export async function updateChecklistItem(
  id: string,
  propertyId: string | null,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("checklist_items")
      .update({ ...itemFromForm(formData), active: formData.get("active") === "on" })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/checklist");
  redirect(backTo(propertyId));
}

export async function deleteChecklistItem(id: string, propertyId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/checklist");
  redirect(backTo(propertyId));
}
