import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CleaningWithRelations,
  InventoryItem,
  IssueStatus,
  IssueWithRelations,
  MaintenanceStatus,
  MaintenanceWithProperty,
  Profile,
  Property,
} from "@/lib/types";

export const CLEANING_SELECT =
  "*, property:properties(id, name, building, address, city), cleaner:profiles!cleanings_cleaner_id_fkey(id, full_name)";

export async function listCleaners({ includeInactive = false } = {}): Promise<Profile[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, role, active, buildings")
    .eq("role", "cleaner")
    .order("full_name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listProperties({ includeInactive = false } = {}): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase.from("properties").select("*").order("building").order("name");
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

export const ISSUE_SELECT =
  "*, property:properties(id, name, building), reporter:profiles!issues_reported_by_fkey(id, full_name)";

export async function listIssues(status: IssueStatus): Promise<IssueWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as IssueWithRelations[];
}

export type BuildingStockRow = {
  item: Pick<InventoryItem, "id" | "name" | "unit">;
  quantity: number | null;
  // Effective minimum: the building's own, or item default × apartments.
  par: number;
  customPar: number | null;
  counted_at: string | null;
};

export type BuildingStock = { building: string; apartments: number; rows: BuildingStockRow[] };

// Stock of every building (counted in its supply room by the team).
export async function listBuildingStock(): Promise<BuildingStock[]> {
  const supabase = await createClient();
  const [buildings, { data: items, error: itemsError }, { data: counts, error }] = await Promise.all([
    listBuildingCounts(),
    supabase.from("inventory_items").select("*").eq("active", true).order("position"),
    supabase.from("building_inventory").select("building, item_id, quantity, par_level, counted_at"),
  ]);
  if (itemsError) throw itemsError;
  if (error) throw error;
  const byKey = new Map(
    (counts ?? []).map((c: { building: string; item_id: string }) => [`${c.building}|${c.item_id}`, c]),
  );
  return buildings.map((b) => ({
    building: b.name,
    apartments: b.count,
    rows: (items as InventoryItem[]).map((item) => {
      const count = byKey.get(`${b.name}|${item.id}`) as
        | { quantity: number | null; par_level: number | null; counted_at: string | null }
        | undefined;
      return {
        item: { id: item.id, name: item.name, unit: item.unit },
        quantity: count?.quantity ?? null,
        par: count?.par_level ?? item.default_par * b.count,
        customPar: count?.par_level ?? null,
        counted_at: count?.counted_at ?? null,
      };
    }),
  }));
}

export type LowStockRow = BuildingStockRow & { building: string };

// Items whose last count is below the building's minimum.
export async function listLowStock(): Promise<LowStockRow[]> {
  return (await listBuildingStock()).flatMap((b) =>
    b.rows.filter((r) => r.quantity !== null && r.quantity < r.par).map((r) => ({ ...r, building: b.building })),
  );
}

export async function listMaintenances(filters: {
  from: string;
  to: string;
  status?: MaintenanceStatus;
}): Promise<MaintenanceWithProperty[]> {
  const supabase = await createClient();
  let query = supabase
    .from("maintenances")
    .select("*, property:properties(id, name, building), contractor:contractors(name, phone)")
    .gte("date", filters.from)
    .lte("date", filters.to)
    .order("date")
    .order("time", { nullsFirst: false });
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as MaintenanceWithProperty[];
}

// Photos taken so far per cleaning of a day: checklist photos plus problem
// reports. Looked up by date so it runs alongside the cleanings query.
export async function countPhotosForDate(date: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const supabase = await createClient();
  const [{ data: tasks }, { data: issues }] = await Promise.all([
    supabase
      .from("cleaning_tasks")
      .select("cleaning_id, cleanings!inner(date)")
      .eq("cleanings.date", date)
      .not("photo_path", "is", null),
    supabase.from("issues").select("cleaning_id, photo_paths, cleanings!inner(date)").eq("cleanings.date", date),
  ]);
  for (const t of tasks ?? []) counts.set(t.cleaning_id, (counts.get(t.cleaning_id) ?? 0) + 1);
  for (const i of issues ?? []) {
    if (i.cleaning_id) counts.set(i.cleaning_id, (counts.get(i.cleaning_id) ?? 0) + i.photo_paths.length);
  }
  return counts;
}

// Buildings with how many active apartments each has, for the building picker.
export const listBuildingCounts = cache(async (): Promise<{ name: string; count: number }[]> => {
  const properties = await listProperties();
  const counts = new Map<string, number>();
  for (const p of properties) if (p.building) counts.set(p.building, (counts.get(p.building) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});

// Open problems the admin addressed to the cleaning team.
export async function listCleaningTeamIssues(): Promise<IssueWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("status", "open")
    .eq("team", "cleaning")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as IssueWithRelations[];
}
