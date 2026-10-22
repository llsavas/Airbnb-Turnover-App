import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, StatusBadge } from "@/components/ui";
import { formatDateTime, formatDay, formatShortDate, formatTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Cleaning, Property } from "@/lib/types";
import { completeCleaning, startCleaning } from "../actions";

export const metadata: Metadata = { title: "Limpeza" };

type CleaningDetail = Cleaning & { property: Property | null };

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-0.5 whitespace-pre-line text-slate-900">{children}</div>
    </div>
  );
}

export default async function CleaningDetailPage({ params }: PageProps<"/limpezas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cleaning } = await supabase
    .from("cleanings")
    .select("*, property:properties(*)")
    .eq("id", id)
    .maybeSingle<CleaningDetail>();
  if (!cleaning) notFound();

  const property = cleaning.property;
  const address = [property?.address, property?.city].filter(Boolean).join(", ");
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/limpezas" className="text-sm font-medium text-brand-700">
        ← Minhas limpezas
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{property?.name}</h1>
          <p className="text-sm text-slate-500 capitalize">{formatDay(cleaning.date)}</p>
        </div>
        <StatusBadge status={cleaning.status} />
      </div>

      <Card className="space-y-4">
        {address && (
          <Info label="Endereço">
            {address}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="ml-2 text-sm font-medium text-brand-700">
                Abrir no mapa
              </a>
            )}
          </Info>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Info label="Liberado a partir de">{formatTime(cleaning.starts_at) || "—"}</Info>
          <Info label="Pronto até">{formatTime(cleaning.ends_at) || "—"}</Info>
        </div>
        {(cleaning.next_checkin || cleaning.guest_count) && (
          <div className="grid grid-cols-2 gap-4">
            {cleaning.next_checkin && (
              <Info label="Próximo check-in">{formatShortDate(cleaning.next_checkin)}</Info>
            )}
            {cleaning.guest_count && <Info label="Hóspedes">{cleaning.guest_count}</Info>}
          </div>
        )}
        {property?.access_instructions && (
          <Info label="Como entrar">{property.access_instructions}</Info>
        )}
        {cleaning.notes && <Info label="Observações desta limpeza">{cleaning.notes}</Info>}
        {property?.notes && <Info label="Sobre o imóvel">{property.notes}</Info>}
      </Card>

      {cleaning.status === "scheduled" && (
        <ActionForm action={startCleaning.bind(null, id)}>
          <SubmitButton className="w-full py-4 text-base">Iniciar limpeza</SubmitButton>
        </ActionForm>
      )}
      {cleaning.status === "in_progress" && (
        <ActionForm action={completeCleaning.bind(null, id)}>
          <p className="mb-2 text-center text-sm text-slate-500">
            Iniciada às {formatDateTime(cleaning.started_at!).split(" ").pop()}
          </p>
          <SubmitButton className="w-full py-4 text-base" confirm="Confirmar que a limpeza foi concluída?">
            Concluir limpeza
          </SubmitButton>
        </ActionForm>
      )}
      {cleaning.status === "completed" && cleaning.completed_at && (
        <p className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
          Limpeza concluída em {formatDateTime(cleaning.completed_at)}. Obrigado!
        </p>
      )}
    </div>
  );
}
