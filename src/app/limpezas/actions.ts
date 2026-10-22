"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toFormState, type FormState } from "@/lib/form";

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
