"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Saves which buildings this person is looking at (empty = all).
export async function saveBuildingSelection(buildings: string[]) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_buildings", {
    new_buildings: [...new Set(buildings.filter(Boolean))],
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}
