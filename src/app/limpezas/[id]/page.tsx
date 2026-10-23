import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, FlameIcon, Input, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDayShort, formatHourOf } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import {
  ISSUE_CATEGORY_LABELS,
  type CleaningTask,
  type CleaningWithRelations,
  type InventoryItem,
  type Issue,
  type Property,
  type PropertyInventory,
} from "@/lib/types";
import { aptTitle, scheduleLine } from "../../admin/_painel/daily-card";
import { completeCleaning, saveInventory, startCleaning } from "../actions";
import { Checklist } from "./checklist";
import { IssueForm } from "./issue-form";

export const metadata: Metadata = { title: "Limpeza" };
// Photo uploads from phones on mobile data.
export const maxDuration = 60;

type CleaningDetail = CleaningWithRelations & {
  property: (Property & { building: string | null }) | null;
};

export default async function CleaningDetailPage({ params, searchParams }: PageProps<"/limpezas/[id]">) {
  const profile = await requireUser();
  const { id } = await params;
  const { de } = await searchParams;
  const supabase = await createClient();
  const { data: cleaning } = await supabase
    .from("cleanings")
    .select("*, property:properties(*), cleaner:profiles!cleanings_cleaner_id_fkey(id, full_name)")
    .eq("id", id)
    .maybeSingle<CleaningDetail>();
  if (!cleaning) notFound();

  const fromAdmin = de === "admin" && profile.role === "admin";
  const back = fromAdmin ? `/admin?dia=${cleaning.date}` : `/limpezas?dia=${cleaning.date}`;

  const [{ data: tasks }, { data: items }, { data: stock }, { data: issues }] = await Promise.all([
    supabase.from("cleaning_tasks").select("*").eq("cleaning_id", id).order("position").overrideTypes<CleaningTask[], { merge: false }>(),
    supabase.from("inventory_items").select("*").eq("active", true).order("position").overrideTypes<InventoryItem[], { merge: false }>(),
    supabase
      .from("property_inventory")
      .select("*")
      .eq("property_id", cleaning.property_id)
      .overrideTypes<PropertyInventory[], { merge: false }>(),
    supabase.from("issues").select("*").eq("cleaning_id", id).order("created_at").overrideTypes<Issue[], { merge: false }>(),
  ]);
  const photoUrls = await signedPhotoUrls((tasks ?? []).map((t) => t.photo_path));
  const lastCount = new Map((stock ?? []).map((s) => [s.item_id, s]));
  const inProgress = cleaning.status === "in_progress";
  const missing = (tasks ?? []).filter((t) => !t.done).length;
  const property = cleaning.property;
  const sameDay = cleaning.next_checkin === cleaning.date;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href={back} className="text-sm font-medium text-slate-600 hover:text-slate-900">
        ‹ Voltar
      </Link>

      <Card className={`space-y-3 ${sameDay && cleaning.status !== "completed" ? "ring-2 ring-red-700" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            {property?.building && (
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{property.building}</p>
            )}
            <h1 className="text-2xl font-bold">{aptTitle(property?.name)}</h1>
            <p className="text-sm text-slate-500">{formatDayShort(cleaning.date)}</p>
          </div>
          <StatusBadge status={cleaning.status} />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {sameDay && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-red-200">
              <FlameIcon /> Check-in no mesmo dia
            </span>
          )}
          {cleaning.released_at && cleaning.status === "scheduled" && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
              Liberado às {formatHourOf(cleaning.released_at)}: pode começar
            </span>
          )}
          {cleaning.started_at && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              Início {formatDateTime(cleaning.started_at)}
            </span>
          )}
          {cleaning.completed_at && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              Fim {formatDateTime(cleaning.completed_at)}
            </span>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Observações do admin</p>
          <p>{scheduleLine(cleaning)}</p>
          {cleaning.notes && <p className="whitespace-pre-line">{cleaning.notes}</p>}
          {property?.access_instructions && (
            <p className="mt-1 whitespace-pre-line text-slate-600">Acesso: {property.access_instructions}</p>
          )}
        </div>
      </Card>

      {cleaning.status === "scheduled" && (
        <ActionForm action={startCleaning.bind(null, id)}>
          <SubmitButton variant="go" className="w-full py-4 text-base">
            ▷ Iniciar limpeza
          </SubmitButton>
        </ActionForm>
      )}

      {inProgress && tasks && tasks.length > 0 && (
        <Checklist
          cleaningId={id}
          editable
          tasks={tasks.map((t) => ({ ...t, photo_url: t.photo_path ? (photoUrls.get(t.photo_path) ?? null) : null }))}
        />
      )}

      {inProgress && items && items.length > 0 && (
        <details className="rounded-xl bg-surface shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Estoque</summary>
          <ActionForm action={saveInventory.bind(null, id)} className="space-y-2 px-4 pb-4">
            <p className="text-sm text-slate-500">Quanto ficou no apartamento depois de repor (mínimo entre parênteses).</p>
            {items.map((item) => {
              const last = lastCount.get(item.id);
              const par = last?.par_level ?? item.default_par;
              return (
                <label key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-[15px]">
                    {item.name} <span className="text-xs text-slate-500">({par})</span>
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
        </details>
      )}

      {issues && issues.length > 0 && (
        <Card className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg bg-red-50 px-3 py-2 text-sm">
              <p className="font-medium text-red-800">⚠ {ISSUE_CATEGORY_LABELS[issue.category]}</p>
              <p className="text-red-900">{issue.description}</p>
            </div>
          ))}
        </Card>
      )}

      {inProgress && <IssueForm cleaningId={id} />}

      {inProgress && (
        <ActionForm action={completeCleaning.bind(null, id)}>
          {missing > 0 && (
            <p className="mb-2 text-center text-sm text-slate-500">
              Faltam {missing} itens do checklist
              {profile.role === "admin" && " (como admin, você pode concluir mesmo assim)"}
            </p>
          )}
          <SubmitButton className="w-full py-4 text-base" confirm="Confirmar que a limpeza foi concluída?">
            ✓ Concluir limpeza
          </SubmitButton>
        </ActionForm>
      )}

      {cleaning.status === "completed" && cleaning.completed_at && (
        <Card className="text-center">
          <p className="font-semibold">Limpeza finalizada</p>
          <p className="text-sm text-slate-500">
            {formatDateTime(cleaning.completed_at)}
            {cleaning.cleaner && ` · ${cleaning.cleaner.full_name}`}
          </p>
        </Card>
      )}
    </div>
  );
}
