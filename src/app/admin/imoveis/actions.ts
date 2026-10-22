"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormError, requiredText, text, toFormState, type FormState } from "@/lib/form";

function propertyFromForm(formData: FormData) {
  const icalUrl = text(formData, "ical_url");
  if (icalUrl && !/^(https?|webcal):\/\//i.test(icalUrl)) {
    throw new FormError("O link do iCal precisa começar com https://");
  }
  return {
    name: requiredText(formData, "name", "Nome"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    access_instructions: text(formData, "access_instructions"),
    notes: text(formData, "notes"),
    checkout_time: text(formData, "checkout_time") ?? "11:00",
    checkin_time: text(formData, "checkin_time") ?? "15:00",
    default_cleaner_id: text(formData, "default_cleaner_id"),
    hospitable_property_id: text(formData, "hospitable_property_id"),
    ical_url: icalUrl,
    active: formData.get("active") !== "off",
  };
}

function friendlyError(error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new FormError("Já existe um imóvel com esse ID do Hospitable.");
  throw new Error(error.message);
}

export async function createProperty(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("properties").insert(propertyFromForm(formData));
    if (error) friendlyError(error);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/imoveis");
  redirect("/admin/imoveis");
}

export async function updateProperty(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("properties")
      .update(propertyFromForm(formData))
      .eq("id", id);
    if (error) friendlyError(error);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/imoveis");
  redirect("/admin/imoveis");
}

// One property per line: Nome; Endereço; Cidade; Link iCal
export async function importProperties(_: FormState, formData: FormData): Promise<FormState> {
  let count = 0;
  try {
    await requireAdmin();
    const lines = (text(formData, "rows") ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) throw new FormError("Cole pelo menos uma linha.");

    const rows = lines.map((line, i) => {
      const [name, address, city, icalUrl] = line.split(/[;\t]/).map((p) => p?.trim() || null);
      if (!name) throw new FormError(`Linha ${i + 1}: falta o nome do imóvel.`);
      if (icalUrl && !/^(https?|webcal):\/\//i.test(icalUrl)) {
        throw new FormError(`Linha ${i + 1}: o link do iCal precisa começar com https://`);
      }
      return { name, address, city, ical_url: icalUrl };
    });

    const supabase = await createClient();
    const { error } = await supabase.from("properties").insert(rows);
    if (error) throw new Error(error.message);
    count = rows.length;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/imoveis");
  return { success: `${count} imóveis importados.` };
}
