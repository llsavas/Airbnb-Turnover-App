"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormError, requiredText, text, toFormState, type FormState } from "@/lib/form";
import { uploadCleaningPhoto, uploadIssuePhoto } from "@/lib/photos";
import {
  ISSUE_CATEGORY_LABELS,
  ISSUE_URGENCY_LABELS,
  type IssueCategory,
  type IssueUrgency,
} from "@/lib/types";

const MAX_ISSUE_PHOTOS = 4;

function revalidateCleaning(id: string) {
  revalidatePath(`/limpezas/${id}`);
  revalidatePath(`/admin/limpezas/${id}`);
}

async function advance(fn: "start_cleaning" | "complete_cleaning", id: string): Promise<FormState> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc(fn, { cleaning_id: id });
    if (error) return { error: error.message };
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/limpezas", "layout");
  revalidatePath("/admin", "layout");
  return null;
}

export async function startCleaning(id: string): Promise<FormState> {
  return advance("start_cleaning", id);
}

export async function completeCleaning(id: string): Promise<FormState> {
  return advance("complete_cleaning", id);
}

export async function setTaskDone(cleaningId: string, taskId: string, done: boolean): Promise<FormState> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_cleaning_task", { task_id: taskId, is_done: done });
    if (error) return { error: error.message };
  } catch (error) {
    return toFormState(error);
  }
  revalidateCleaning(cleaningId);
  return null;
}

// Taking the photo also ticks the item.
export async function uploadTaskPhoto(
  cleaningId: string,
  taskId: string,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireUser();
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new FormError("Escolha uma foto.");
    const path = await uploadCleaningPhoto(cleaningId, file);
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_cleaning_task", {
      task_id: taskId,
      is_done: true,
      new_photo_path: path,
    });
    if (error) return { error: error.message };
  } catch (error) {
    return toFormState(error);
  }
  revalidateCleaning(cleaningId);
  return null;
}

// Stock of a building's supply room, counted from the building block of the
// Diário. Empty fields keep the previous count.
export async function saveBuildingStock(building: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireUser();
    const counts: Record<string, number> = {};
    for (const [key, value] of formData) {
      if (!key.startsWith("item:") || typeof value !== "string" || value.trim() === "") continue;
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n) || n < 0) throw new FormError("Use apenas números inteiros.");
      counts[key.slice(5)] = n;
    }
    if (Object.keys(counts).length === 0) throw new FormError("Preencha pelo menos um item.");

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_building_inventory", { p_building: building, counts });
    if (error) return { error: error.message };
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/limpezas", "layout");
  revalidatePath("/admin", "layout");
  return { success: "Estoque salvo. Obrigado!" };
}

export async function reportIssue(cleaningId: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    const profile = await requireUser();
    const category = text(formData, "category") as IssueCategory;
    const urgency = text(formData, "urgency") as IssueUrgency;
    if (!(category in ISSUE_CATEGORY_LABELS)) throw new FormError("Escolha o tipo de problema.");
    if (!(urgency in ISSUE_URGENCY_LABELS)) throw new FormError("Escolha a urgência.");
    const description = requiredText(formData, "description", "O que aconteceu");

    const files = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_ISSUE_PHOTOS) throw new FormError(`Envie no máximo ${MAX_ISSUE_PHOTOS} fotos.`);

    const supabase = await createClient();
    const { data: cleaning } = await supabase
      .from("cleanings")
      .select("property_id")
      .eq("id", cleaningId)
      .single();
    if (!cleaning) throw new FormError("Limpeza não encontrada.");

    const photoPaths = await Promise.all(files.map((f) => uploadCleaningPhoto(cleaningId, f)));
    const { error } = await supabase.from("issues").insert({
      property_id: cleaning.property_id,
      cleaning_id: cleaningId,
      reported_by: profile.id,
      category,
      urgency,
      description,
      photo_paths: photoPaths,
    });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidateCleaning(cleaningId);
  revalidatePath("/admin", "layout");
  return { success: "Problema enviado. A gestão já foi avisada." };
}

// Marks a problem as resolved, optionally with "after" photos and a note.
// Used by the team on the cleaning page and by admins on Problemas.
export async function resolveIssueWithPhotos(
  issueId: string,
  cleaningId: string | null,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireUser();
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const supabase = await createClient();
    let paths: string[] = [];
    if (files.length > 0 && cleaningId) {
      paths = await Promise.all(files.map((f) => uploadCleaningPhoto(cleaningId, f)));
    } else if (files.length > 0) {
      // Problems registered without a cleaning keep photos in the apartment's folder.
      const { data: issue } = await supabase.from("issues").select("property_id").eq("id", issueId).single();
      if (!issue) throw new FormError("Problema não encontrado.");
      paths = await Promise.all(files.map((f) => uploadIssuePhoto(issue.property_id, f)));
    }
    const { error } = await supabase.rpc("resolve_issue", {
      issue_id: issueId,
      resolution_text: text(formData, "resolution") ?? "",
      photo_paths: paths,
    });
    if (error) return { error: error.message };
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/limpezas", "layout");
  revalidatePath("/admin", "layout");
  return { success: "Problema resolvido." };
}
