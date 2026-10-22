import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Input, StatusBadge } from "@/components/ui";
import { formatDateTime, formatDay, formatShortDate, formatTime } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import {
  ISSUE_CATEGORY_LABELS,
  type Cleaning,
  type CleaningTask,
  type InventoryItem,
  type Issue,
  type Property,
  type PropertyInventory,
} from "@/lib/types";
import { completeCleaning, saveInventory, startCleaning } from "../actions";
import { Checklist } from "./checklist";
import { IssueForm } from "./issue-form";

export const metadata: Metadata = { title: "Limpeza" };
// Photo uploads from phones on mobile data.
export const maxDuration = 60;

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

  const [{ data: tasks }, { data: items }, { data: stock }, { data: issues }] = await Promise.all([
    supabase.from("cleaning_tasks").select("*").eq("cleaning_id", id).order("position").overrideTypes<CleaningTask[], { merge: false }>(),
    supabase.from("inventory_items").select("*").eq("active", true).order("position").overrideTypes<InventoryItem[], { merge: false }>(),
    supabase
      .from("property_inventory")
      .select("*")
      .eq("property_id", cleaning.property_id)
      .overrideTypes<PropertyInventory[], { merge: false }>(),
    supabase
      .from("issues")
      .select("*")
      .eq("cleaning_id", id)
      .order("created_at")
      .overrideTypes<Issue[], { merge: false }>(),
  ]);
  const photoUrls = await signedPhotoUrls((tasks ?? []).map((t) => t.photo_path));
  const lastCount = new Map((stock ?? []).map((s) => [s.item_id, s]));
  const inProgress = cleaning.status === "in_progress";
  const missing = (tasks ?? []).filter((t) => !t.done).length;

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
            {cleaning.guest_count && <Info label="Preparar para">{cleaning.guest_count} hóspede(s)</Info>}
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

      {tasks && tasks.length > 0 && (
        <Checklist
          cleaningId={id}
          editable={inProgress}
          tasks={tasks.map((t) => ({ ...t, photo_url: t.photo_path ? (photoUrls.get(t.photo_path) ?? null) : null }))}
        />
      )}

      {inProgress && items && items.length > 0 && (
        <Card>
          <h2 className="font-semibold">Estoque</h2>
          <p className="mb-3 text-sm text-slate-500">
            Conte o que ficou no apartamento depois de repor. O número entre parênteses é o mínimo.
          </p>
          <ActionForm action={saveInventory.bind(null, id)} className="space-y-2">
            {items.map((item) => {
              const last = lastCount.get(item.id);
              const par = last?.par_level ?? item.default_par;
              return (
                <label key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-[15px]">
                    {item.name} <span className="text-xs text-slate-500">(mín. {par} {item.unit})</span>
                  </span>
                  <div className="w-20 shrink-0">
                    <Input
                      name={`item:${item.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      defaultValue={last?.quantity ?? ""}
                      className="text-center"
                    />
                  </div>
                </label>
              );
            })}
            <SubmitButton variant="secondary" className="mt-2 w-full">
              Salvar estoque
            </SubmitButton>
          </ActionForm>
        </Card>
      )}

      {issues && issues.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">Problemas reportados</h2>
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg bg-red-50 px-3 py-2 text-sm">
              <p className="font-medium text-red-800">{ISSUE_CATEGORY_LABELS[issue.category]}</p>
              <p className="text-red-900">{issue.description}</p>
              {issue.status === "resolved" && <p className="mt-1 text-xs text-emerald-700">Resolvido</p>}
            </div>
          ))}
        </Card>
      )}

      {cleaning.status !== "completed" && cleaning.status !== "cancelled" && <IssueForm cleaningId={id} />}

      {inProgress && (
        <ActionForm action={completeCleaning.bind(null, id)}>
          <p className="mb-2 text-center text-sm text-slate-500">
            Iniciada às {formatDateTime(cleaning.started_at!).split(" ").pop()}
            {missing > 0 && ` · faltam ${missing} itens do checklist`}
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
