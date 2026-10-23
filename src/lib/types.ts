export type UserRole = "admin" | "cleaner";
export type CleaningStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type CleaningSource = "manual" | "hospitable" | "ical";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  // Buildings this team member works in (they choose them in the app).
  buildings: string[];
};

export type Property = {
  id: string;
  name: string;
  building: string | null;
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
  released_at: string | null;
  // Time the guest said in the chat they'll leave (earlier than checkout).
  guest_departure_time: string | null;
};

export type CleaningWithRelations = Cleaning & {
  property: Pick<Property, "id" | "name" | "building" | "address" | "city"> | null;
  cleaner: Pick<Profile, "id" | "full_name"> | null;
};

export const STATUS_LABELS: Record<CleaningStatus, string> = {
  scheduled: "Pendente",
  in_progress: "Iniciado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const SOURCE_LABELS: Record<CleaningSource, string> = {
  manual: "Manual",
  hospitable: "Hospitable",
  ical: "iCal",
};

export type CleaningTask = {
  id: string;
  cleaning_id: string;
  room: string;
  label: string;
  tip: string | null;
  requires_photo: boolean;
  position: number;
  done: boolean;
  done_at: string | null;
  photo_path: string | null;
};

export type ChecklistItem = {
  id: string;
  property_id: string | null;
  room: string;
  label: string;
  tip: string | null;
  requires_photo: boolean;
  position: number;
  active: boolean;
};

export type IssueCategory = "damage" | "maintenance" | "missing_item" | "dirty" | "forgotten_item" | "other";
export type IssueUrgency = "low" | "normal" | "urgent";
export type IssueStatus = "open" | "resolved";

export type Issue = {
  id: string;
  property_id: string;
  cleaning_id: string | null;
  reported_by: string | null;
  category: IssueCategory;
  urgency: IssueUrgency;
  description: string;
  photo_paths: string[];
  status: IssueStatus;
  resolution: string | null;
  // "After" photos sent when resolving.
  resolution_photo_paths: string[];
  resolved_at: string | null;
  created_at: string;
};

export type IssueWithRelations = Issue & {
  property: Pick<Property, "id" | "name"> | null;
  reporter: Pick<Profile, "id" | "full_name"> | null;
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  damage: "Dano / quebrado",
  maintenance: "Manutenção (não funciona)",
  missing_item: "Item faltando",
  dirty: "Sujeira fora do normal",
  forgotten_item: "Item esquecido",
  other: "Outro",
};

export const ISSUE_URGENCY_LABELS: Record<IssueUrgency, string> = {
  low: "Pode esperar",
  normal: "Normal",
  urgent: "Urgente (antes do próximo hóspede)",
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  default_par: number;
  position: number;
  active: boolean;
};

export type PropertyInventory = {
  property_id: string;
  item_id: string;
  par_level: number | null;
  quantity: number | null;
  counted_at: string | null;
};

export type SyncRun = {
  id: number;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  message: string | null;
  created: number;
  updated: number;
  cancelled: number;
};

export type Checkin = {
  id: string;
  property_id: string;
  external_id: string;
  reservation_code: string | null;
  platform: string | null;
  guest_name: string | null;
  guest_count: number | null;
  checkin_date: string;
  checkin_time: string | null;
  checkout_date: string | null;
  cancelled: boolean;
  guests: { name: string; cpf: string | null }[];
  arrival_time: string | null;
  vehicle_plate: string | null;
  ai_notes: string | null;
  extracted_at: string | null;
  registered: boolean;
  registered_at: string | null;
};

export type CheckinWithProperty = Checkin & {
  property: Pick<Property, "id" | "name" | "building"> | null;
};

export type MaintenanceStatus = "scheduled" | "done" | "cancelled";

export type Maintenance = {
  id: string;
  property_id: string;
  date: string;
  time: string | null;
  title: string;
  description: string | null;
  assignee: string | null;
  status: MaintenanceStatus;
  issue_id: string | null;
  contractor_id: string | null;
  done_at: string | null;
};

export type MaintenanceWithProperty = Maintenance & {
  property: Pick<Property, "id" | "name" | "building"> | null;
  contractor: { name: string; phone: string | null } | null;
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: "Agendada",
  done: "Feita",
  cancelled: "Cancelada",
};

export type PropertyLinen = {
  id: string;
  property_id: string;
  item: string;
  quantity: number;
  position: number;
};

export type ReferencePhoto = {
  id: string;
  property_id: string;
  path: string;
  caption: string | null;
  position: number;
};

export type Contractor = {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  active: boolean;
};
