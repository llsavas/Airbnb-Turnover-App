"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormError, toFormState, type FormState } from "@/lib/form";

export async function saveMyBuildings(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireUser();
    const buildings = formData.getAll("buildings").filter((b): b is string => typeof b === "string" && !!b);
    if (buildings.length === 0) throw new FormError("Escolha pelo menos um prédio.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_my_buildings", { new_buildings: buildings });
    if (error) throw error;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/limpezas", "layout");
  redirect("/limpezas");
}
