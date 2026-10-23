"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reopenIssue(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: "open", resolved_at: null, resolved_by: null, resolution_photo_paths: [] })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin", "layout");
}
