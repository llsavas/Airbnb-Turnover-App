"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { FormError, int, requiredText, text, toFormState, type FormState } from "@/lib/form";
import type { CleaningStatus, Property } from "@/lib/types";

const STATUSES: CleaningStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

function requiredDate(formData: FormData) {
  const date = requiredText(formData, "date", "Data");
  if (!isValidDate(date)) throw new FormError("Data inválida.");
  return date;
}

function revalidateCleanings() {
  revalidatePath("/admin", "layout");
  revalidatePath("/limpezas", "layout");
}

export async function createCleaning(_: FormState, formData: FormData): Promise<FormState> {
  let date: string;
  try {
    await requireAdmin();
    const supabase = await createClient();
    const propertyId = requiredText(formData, "property_id", "Imóvel");
    date = requiredDate(formData);

    const { data: property } = await supabase
      .from("properties")
      .select("checkout_time, checkin_time, default_cleaner_id")
      .eq("id", propertyId)
      .single<Pick<Property, "checkout_time" | "checkin_time" | "default_cleaner_id">>();
    if (!property) throw new FormError("Imóvel não encontrado.");

    const cleanerChoice = text(formData, "cleaner_id");
    const { error } = await supabase.from("cleanings").insert({
      property_id: propertyId,
      date,
      // "auto" means: use the property's default cleaner.
      cleaner_id: cleanerChoice === "auto" ? property.default_cleaner_id : cleanerChoice,
      starts_at: text(formData, "starts_at") ?? property.checkout_time,
      ends_at: text(formData, "ends_at") ?? property.checkin_time,
      next_checkin: text(formData, "next_checkin"),
      guest_count: int(formData, "guest_count"),
      notes: text(formData, "notes"),
      source: "manual",
    });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateCleanings();
  redirect(`/admin/limpezas?semana=${date}`);
}

export async function updateCleaning(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  let date: string;
  try {
    await requireAdmin();
    date = requiredDate(formData);
    const status = text(formData, "status") as CleaningStatus;
    if (!STATUSES.includes(status)) throw new FormError("Situação inválida.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("cleanings")
      .update({
        date,
        cleaner_id: text(formData, "cleaner_id"),
        starts_at: text(formData, "starts_at"),
        ends_at: text(formData, "ends_at"),
        next_checkin: text(formData, "next_checkin"),
        guest_count: int(formData, "guest_count"),
        notes: text(formData, "notes"),
        status,
      })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateCleanings();
  redirect(`/admin/limpezas?semana=${date}`);
}

export async function assignCleaner(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cleanings")
    .update({ cleaner_id: text(formData, "cleaner_id") })
    .eq("id", id);
  if (error) throw error;
  revalidateCleanings();
}

export async function deleteCleaning(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("cleanings").delete().eq("id", id);
  if (error) throw error;
  revalidateCleanings();
  redirect("/admin/limpezas");
}

// Notes from the Diário card, saved as they're typed. The cleaner sees them.
export async function saveCleaningNotes(id: string, notes: string): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("cleanings")
      .update({ notes: notes.trim() || null })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/limpezas", "layout");
  return null;
}

// The guest already left: the cleaning can start now.
export async function setReleasedEarly(id: string, released: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cleanings")
    .update({ released_at: released ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  revalidateCleanings();
}
