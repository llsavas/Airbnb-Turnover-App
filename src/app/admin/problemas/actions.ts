"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { text, toFormState, type FormState } from "@/lib/form";

export async function resolveIssue(id: string, _: FormState, formData: FormData): Promise<FormState> {
  try {
    const profile = await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("issues")
      .update({
        status: "resolved",
        resolution: text(formData, "resolution"),
        resolved_at: new Date().toISOString(),
        resolved_by: profile.id,
      })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  return null;
}

export async function reopenIssue(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: "open", resolved_at: null, resolved_by: null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin", "layout");
}
