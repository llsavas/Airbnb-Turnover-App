"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { toFormState, type FormState } from "@/lib/form";
import { importHospitableProperties, syncHospitable } from "@/lib/hospitable";

export async function syncNow(): Promise<FormState> {
  let message: string;
  try {
    await requireAdmin();
    const { created, updated, cancelled } = await syncHospitable();
    message = `Sincronizado: ${created} novas, ${updated} atualizadas, ${cancelled} canceladas.`;
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/limpezas", "layout");
  return { success: message };
}

export async function importFromHospitable(): Promise<FormState> {
  let count: number;
  try {
    await requireAdmin();
    count = await importHospitableProperties();
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return toFormState(error);
  }
  revalidatePath("/admin/imoveis");
  return { success: count ? `${count} imóveis novos importados.` : "Nenhum imóvel novo no Hospitable." };
}
