import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CleaningWithRelations,
  InventoryItem,
  IssueStatus,
  IssueWithRelations,
  Profile,
  Property,
} from "@/lib/types";

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

export const ISSUE_SELECT =
  "*, property:properties(id, name), reporter:profiles!issues_reported_by_fkey(id, full_name)";

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

export type LowStockRow = {
  property: Pick<Property, "id" | "name">;
  item: Pick<InventoryItem, "id" | "name" | "unit">;
  quantity: number;
  par: number;
  counted_at: string | null;
};

// Items whose last count is below the minimum, across active properties.
export async function listLowStock(): Promise<LowStockRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_inventory")
    .select(
      "quantity, par_level, counted_at, property:properties!inner(id, name, active), item:inventory_items!inner(id, name, unit, default_par, active)",
    )
    .not("quantity", "is", null);
  if (error) throw error;
  type Row = {
    quantity: number;
    par_level: number | null;
    counted_at: string | null;
    property: Pick<Property, "id" | "name" | "active">;
    item: InventoryItem;
  };
  return (data as unknown as Row[])
    .filter((r) => r.property.active && r.item.active && r.quantity < (r.par_level ?? r.item.default_par))
    .map((r) => ({
      property: { id: r.property.id, name: r.property.name },
      item: { id: r.item.id, name: r.item.name, unit: r.item.unit },
      quantity: r.quantity,
      par: r.par_level ?? r.item.default_par,
      counted_at: r.counted_at,
    }))
    .sort((a, b) => a.property.name.localeCompare(b.property.name) || a.item.name.localeCompare(b.item.name));
}
