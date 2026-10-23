"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { toFormState, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import {
  extractCheckinDetails,
  extractDepartureTimes,
  importHospitableProperties,
  syncHospitable,
} from "@/lib/hospitable";

export async function syncNow(): Promise<FormState> {
  let message: string;
  try {
    await requireAdmin();
    const { created, updated, cancelled } = await syncHospitable();
    const departures = await extractDepartureTimes();
    message = `Sincronizado: ${created} novas, ${updated} atualizadas, ${cancelled} canceladas.`;
    if (departures) message += ` ${departures} hóspede(s) avisaram saída mais cedo.`;
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

// Check-ins tab: refresh reservations, then read names/CPF/arrival from chats.
export async function syncCheckins(): Promise<FormState> {
  let message: string;
  try {
    await requireAdmin();
    await syncHospitable();
    const { read, aiError } = await extractCheckinDetails();
    message = aiError
      ? `${read} conversas lidas só por padrão (CPF e placa): a IA não respondeu. ${aiError}`
      : `${read} conversas lidas.`;
    if (aiError) {
      revalidatePath("/admin", "layout");
      return { error: message };
    }
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  return { success: message };
}

// "Registrado": the guest details were passed on to the building's front desk.
export async function setCheckinRegistered(id: string, registered: boolean) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("checkins")
    .update({
      registered,
      registered_at: registered ? new Date().toISOString() : null,
      registered_by: registered ? profile.id : null,
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}
