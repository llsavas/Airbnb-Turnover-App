"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listProperties } from "@/lib/data";
import { FormError, requiredText, text, toFormState, type FormState } from "@/lib/form";
import { readIssueText, type IssueReading } from "@/lib/issue-reader";
import { uploadIssuePhoto } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { ISSUE_TEAM_LABELS, ISSUE_URGENCY_LABELS, type IssueTeam, type IssueUrgency } from "@/lib/types";

const MAX_PHOTOS = 4;

export async function reopenIssue(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: "open", resolved_at: null, resolved_by: null, resolution_photo_paths: [] })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin", "layout");
  revalidatePath("/limpezas", "layout");
}

// "215 Skyline gaveta solta" → building, apartment and description, shown on
// a card for the admin to confirm.
export async function readIssue(note: string): Promise<IssueReading | { error: string }> {
  await requireAdmin();
  const trimmed = note.trim().slice(0, 500);
  if (!trimmed) return { error: "Escreva o problema. Ex.: 215 Skyline gaveta solta" };
  return readIssueText(trimmed, await listProperties());
}

export async function createIssue(formData: FormData): Promise<FormState> {
  try {
    const profile = await requireAdmin();
    const propertyId = text(formData, "property_id");
    if (!propertyId) throw new FormError("Escolha o apartamento.");
    const description = requiredText(formData, "description", "Problema");
    const team = text(formData, "team") as IssueTeam;
    const urgency = text(formData, "urgency") as IssueUrgency;
    if (!(team in ISSUE_TEAM_LABELS)) throw new FormError("Escolha quem resolve.");
    if (!(urgency in ISSUE_URGENCY_LABELS)) throw new FormError("Escolha a urgência.");
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_PHOTOS) throw new FormError(`Envie no máximo ${MAX_PHOTOS} fotos.`);

    const photoPaths = await Promise.all(files.map((f) => uploadIssuePhoto(propertyId, f)));
    const supabase = await createClient();
    const { error } = await supabase.from("issues").insert({
      property_id: propertyId,
      reported_by: profile.id,
      category: team === "maintenance" ? "maintenance" : "other",
      team,
      urgency,
      description,
      photo_paths: photoPaths,
    });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/limpezas", "layout");
  return { success: "Problema registrado." };
}
