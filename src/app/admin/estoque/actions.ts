"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormError, int, requiredText, toFormState, type FormState } from "@/lib/form";

function itemFromForm(formData: FormData) {
  const defaultPar = int(formData, "default_par");
  if (defaultPar === null || defaultPar < 0) throw new FormError("Informe o mínimo (0 ou mais).");
  return {
    name: requiredText(formData, "name", "Item"),
    unit: requiredText(formData, "unit", "Unidade"),
    default_par: defaultPar,
  };
}

function friendlyError(error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new FormError("Já existe um item com esse nome.");
  throw new Error(error.message);
}

export async function createItem(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count } = await supabase.from("inventory_items").select("*", { count: "exact", head: true });
    const { error } = await supabase
      .from("inventory_items")
      .insert({ ...itemFromForm(formData), position: ((count ?? 0) + 1) * 10 });
    if (error) friendlyError(error);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/estoque");
  return { success: "Item adicionado." };
}

export async function updateItem(id: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("inventory_items")
      .update({ ...itemFromForm(formData), active: formData.get("active") === "on" })
      .eq("id", id);
    if (error) friendlyError(error);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/estoque");
  return { success: "Salvo." };
}

// After a restock the building is back at its minimum.
export async function markRestocked(building: string, itemId: string, par: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("building_inventory")
    .upsert(
      { building, item_id: itemId, quantity: par, counted_at: new Date().toISOString(), counted_by: null },
      { onConflict: "building,item_id" },
    );
  if (error) throw error;
  revalidatePath("/admin", "layout");
}

// Minimums of one building ("par:<item id>" fields; empty = default).
export async function saveBuildingMinimums(building: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const rows: { building: string; item_id: string; par_level: number | null }[] = [];
    for (const [key, value] of formData) {
      if (!key.startsWith("par:") || typeof value !== "string") continue;
      const par = value.trim() === "" ? null : Number.parseInt(value, 10);
      if (par !== null && (!Number.isFinite(par) || par < 0)) throw new FormError("Use apenas números inteiros.");
      rows.push({ building, item_id: key.slice(4), par_level: par });
    }
    const supabase = await createClient();
    const { error } = await supabase.from("building_inventory").upsert(rows, { onConflict: "building,item_id" });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  return { success: "Mínimos salvos." };
}
