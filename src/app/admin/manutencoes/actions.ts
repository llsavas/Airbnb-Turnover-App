"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { FormError, requiredText, text, toFormState, type FormState } from "@/lib/form";
import type { MaintenanceStatus } from "@/lib/types";

export async function createMaintenance(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const date = requiredText(formData, "date", "Data");
    if (!isValidDate(date)) throw new FormError("Data inválida.");
    const supabase = await createClient();
    const contractorId = text(formData, "contractor_id");
    let assignee = text(formData, "assignee");
    if (contractorId && !assignee) {
      const { data: contractor } = await supabase.from("contractors").select("name").eq("id", contractorId).single();
      assignee = contractor?.name ?? null;
    }
    const { error } = await supabase.from("maintenances").insert({
      property_id: requiredText(formData, "property_id", "Imóvel"),
      date,
      time: text(formData, "time"),
      title: requiredText(formData, "title", "O que fazer"),
      contractor_id: contractorId,
      assignee,
      description: text(formData, "description"),
      issue_id: text(formData, "issue_id"),
    });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  return { success: "Manutenção agendada." };
}

export async function setMaintenanceStatus(id: string, status: MaintenanceStatus) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: maintenance, error } = await supabase
    .from("maintenances")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("issue_id")
    .single();
  if (error) throw error;
  // Finishing the job also closes the problem report it came from.
  if (status === "done" && maintenance.issue_id) {
    await supabase
      .from("issues")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution: "Manutenção feita" })
      .eq("id", maintenance.issue_id)
      .eq("status", "open");
  }
  revalidatePath("/admin", "layout");
}
