import Link from "next/link";
import { AutoSubmitSelect, SubmitButton } from "@/components/forms";
import { FlameIcon, StatusBadge } from "@/components/ui";
import { formatHour, formatHourOf, formatShortDate, nowTime, today } from "@/lib/dates";
import type { CleaningWithRelations, Profile } from "@/lib/types";
import { assignCleaner, setReleasedEarly } from "../limpezas/actions";
import { DateMover } from "./date-mover";
import { NotesBox } from "./notes-box";

export function aptTitle(name: string | undefined) {
  const number = name?.match(/^\d+/)?.[0];
  return number ? `Apto ${number}` : (name ?? "Imóvel removido");
}

// "Saída: 11h | Próximo check-in: 15h" (or the next check-in's date when it
// isn't on the same day).
export function scheduleLine(cleaning: CleaningWithRelations) {
  const parts = [
    cleaning.guest_departure_time
      ? `Saída: ${formatHour(cleaning.guest_departure_time)} (avisou no chat)`
      : `Saída: ${formatHour(cleaning.starts_at) || "—"}`,
  ];
  if (cleaning.next_checkin === cleaning.date) {
    parts.push(`Próximo check-in: ${formatHour(cleaning.ends_at) || "hoje"}`);
  } else if (cleaning.next_checkin) {
    parts.push(`Próximo check-in: ${formatShortDate(cleaning.next_checkin)}`);
  } else {
    parts.push("Sem próximo check-in");
  }
  return parts.join(" | ");
}

// Released by the admin ("Liberar mais cedo"), or automatically once the time
// the guest announced for leaving has passed on the cleaning day.
export function releaseText(cleaning: CleaningWithRelations): string | null {
  if (cleaning.status !== "scheduled") return null;
  if (cleaning.released_at) return `Liberado às ${formatHourOf(cleaning.released_at)}`;
  const said = cleaning.guest_departure_time?.slice(0, 5);
  if (!said || cleaning.date !== today()) return null;
  return nowTime() >= said ? `Liberado às ${formatHour(said)} (hóspede saiu)` : `Hóspede sai às ${formatHour(said)}`;
}

function Badges({ cleaning }: { cleaning: CleaningWithRelations }) {
  const sameDay = cleaning.next_checkin === cleaning.date;
  const release = releaseText(cleaning);
  if (!sameDay && !release) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {sameDay && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
          <FlameIcon /> Entrada no mesmo dia
        </span>
      )}
      {release && (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          {release}
        </span>
      )}
    </div>
  );
}

function cardRing(cleaning: CleaningWithRelations) {
  const urgent = cleaning.next_checkin === cleaning.date && cleaning.status !== "completed";
  return urgent ? "ring-2 ring-red-700" : "ring-1 ring-slate-200";
}

// Team app: tap the card to open the cleaning.
export function TeamCleaningCard({ cleaning, photos }: { cleaning: CleaningWithRelations; photos: number }) {
  return (
    <Link
      href={`/limpezas/${cleaning.id}`}
      className={`flex items-center justify-between gap-3 rounded-xl bg-surface p-4 transition hover:bg-slate-50 ${cardRing(cleaning)}`}
    >
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-lg font-bold">{aptTitle(cleaning.property?.name)}</p>
          <p className="text-xs text-slate-500">{photos} foto(s)</p>
          <Badges cleaning={cleaning} />
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Observações do admin</p>
          <p>{scheduleLine(cleaning)}</p>
          {cleaning.notes && <p className="whitespace-pre-line">{cleaning.notes}</p>}
        </div>
      </div>
      <StatusBadge status={cleaning.status} />
    </Link>
  );
}

export function DailyCleaningCard({
  cleaning,
  cleaners,
  photos,
}: {
  cleaning: CleaningWithRelations;
  cleaners: Profile[];
  photos: number;
}) {
  const open = cleaning.status === "scheduled" || cleaning.status === "in_progress";

  return (
    <div className={`space-y-3 rounded-xl bg-surface p-4 ${cardRing(cleaning)}`}>
      {/* Tapping the top of the card opens the cleaning to start or finish it. */}
      <Link
        href={`/limpezas/${cleaning.id}?de=admin`}
        className="-m-2 flex items-start justify-between gap-3 rounded-lg p-2 hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="text-lg font-bold">{aptTitle(cleaning.property?.name)}</p>
          <p className="text-xs text-slate-500">
            {cleaning.cleaner?.full_name ?? "Sem responsável"} · {photos} foto(s)
          </p>
          <Badges cleaning={cleaning} />
        </div>
        <StatusBadge status={cleaning.status} />
      </Link>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {open ? (
          <form action={assignCleaner.bind(null, cleaning.id)} className="w-full sm:w-auto">
            <AutoSubmitSelect
              name="cleaner_id"
              defaultValue={cleaning.cleaner_id ?? ""}
              placeholder="Sem responsável"
              ariaLabel={`Responsável por ${cleaning.property?.name ?? "limpeza"}`}
              options={cleaners.map((c) => ({ value: c.id, label: c.full_name }))}
            />
          </form>
        ) : (
          <span className="text-sm text-slate-600">{cleaning.cleaner?.full_name ?? "—"}</span>
        )}
        <DateMover cleaningId={cleaning.id} date={cleaning.date} />
        {cleaning.status === "scheduled" && (
          <form action={setReleasedEarly.bind(null, cleaning.id, !cleaning.released_at)}>
            <SubmitButton variant="secondary" className="px-3 py-1.5 text-xs">
              {cleaning.released_at ? "Desfazer liberação" : "Liberar mais cedo"}
            </SubmitButton>
          </form>
        )}
      </div>

      <p className="text-sm text-slate-700">{scheduleLine(cleaning)}</p>
      <NotesBox cleaningId={cleaning.id} initial={cleaning.notes ?? ""} />
    </div>
  );
}
