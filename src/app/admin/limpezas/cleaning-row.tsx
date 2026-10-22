import Link from "next/link";
import { AutoSubmitSelect } from "@/components/forms";
import { StatusBadge } from "@/components/ui";
import { formatTime } from "@/lib/dates";
import type { CleaningWithRelations, Profile } from "@/lib/types";
import { assignCleaner } from "./actions";

export function CleaningRow({
  cleaning,
  cleaners,
}: {
  cleaning: CleaningWithRelations;
  cleaners: Profile[];
}) {
  const timeWindow = [formatTime(cleaning.starts_at), formatTime(cleaning.ends_at)]
    .filter(Boolean)
    .join(" – ");
  const editable = cleaning.status === "scheduled" || cleaning.status === "in_progress";

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/admin/limpezas/${cleaning.id}`} className="min-w-0 hover:underline">
        <p className="truncate font-medium">{cleaning.property?.name ?? "Imóvel removido"}</p>
        <p className="text-sm text-slate-500">
          {timeWindow || "Horário a definir"}
          {cleaning.next_checkin && cleaning.next_checkin === cleaning.date && (
            <span className="ml-2 font-medium text-amber-700">Check-in no mesmo dia</span>
          )}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        {editable ? (
          <form action={assignCleaner.bind(null, cleaning.id)} className="flex-1 sm:flex-none">
            <AutoSubmitSelect
              name="cleaner_id"
              defaultValue={cleaning.cleaner_id ?? ""}
              placeholder="— Sem responsável —"
              ariaLabel={`Responsável por ${cleaning.property?.name ?? "limpeza"}`}
              options={cleaners.map((c) => ({ value: c.id, label: c.full_name }))}
            />
          </form>
        ) : (
          <span className="flex-1 text-sm text-slate-600 sm:w-48 sm:flex-none">
            {cleaning.cleaner?.full_name ?? "—"}
          </span>
        )}
        <StatusBadge status={cleaning.status} />
      </div>
    </div>
  );
}
