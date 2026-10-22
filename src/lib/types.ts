export type UserRole = "admin" | "cleaner";
export type CleaningStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type CleaningSource = "manual" | "hospitable" | "ical";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
};

export type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  access_instructions: string | null;
  notes: string | null;
  checkout_time: string;
  checkin_time: string;
  default_cleaner_id: string | null;
  hospitable_property_id: string | null;
  ical_url: string | null;
  active: boolean;
};

export type Cleaning = {
  id: string;
  property_id: string;
  cleaner_id: string | null;
  date: string;
  starts_at: string | null;
  ends_at: string | null;
  next_checkin: string | null;
  status: CleaningStatus;
  source: CleaningSource;
  external_id: string | null;
  guest_count: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type CleaningWithRelations = Cleaning & {
  property: Pick<Property, "id" | "name" | "address" | "city"> | null;
  cleaner: Pick<Profile, "id" | "full_name"> | null;
};

export const STATUS_LABELS: Record<CleaningStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const SOURCE_LABELS: Record<CleaningSource, string> = {
  manual: "Manual",
  hospitable: "Hospitable",
  ical: "iCal",
};
