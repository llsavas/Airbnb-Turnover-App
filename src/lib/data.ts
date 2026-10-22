import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CleaningWithRelations, Profile, Property } from "@/lib/types";

export const CLEANING_SELECT =
  "*, property:properties(id, name, address, city), cleaner:profiles(id, full_name)";

export async function listCleaners({ includeInactive = false } = {}): Promise<Profile[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .eq("role", "cleaner")
    .order("full_name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listProperties({ includeInactive = false } = {}): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase.from("properties").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listCleanings(filters: {
  from: string;
  to: string;
  cleanerId?: string;
  propertyId?: string;
}): Promise<CleaningWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("cleanings")
    .select(CLEANING_SELECT)
    .gte("date", filters.from)
    .lte("date", filters.to)
    .order("date")
    .order("starts_at", { nullsFirst: false });
  if (filters.cleanerId === "none") query = query.is("cleaner_id", null);
  else if (filters.cleanerId) query = query.eq("cleaner_id", filters.cleanerId);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  const { data, error } = await query;
  if (error) throw error;
  return data as CleaningWithRelations[];
}
