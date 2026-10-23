import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfter } from "@/components/before-after";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ResolveIssue } from "@/components/resolve-issue";
import { Card, FlameIcon, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDayShort } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import {
  ISSUE_CATEGORY_LABELS,
  type CleaningTask,
  type CleaningWithRelations,
  type Issue,
  type Property,
  type PropertyLinen,
  type ReferencePhoto,
} from "@/lib/types";
import { aptTitle, releaseText, scheduleLine } from "../../admin/_painel/daily-card";
import { completeCleaning, startCleaning } from "../actions";
import { Checklist } from "./checklist";
import { IssueSheet } from "./issue-sheet";

export const metadata: Metadata = { title: "Limpeza" };
// Photo uploads from phones on mobile data.
export const maxDuration = 60;

type CleaningDetail = CleaningWithRelations & {
  property:
    | (Property & {
        building: string | null;
        standard: { notes: string | null } | null;
        linens: PropertyLinen[];
        ref_photos: ReferencePhoto[];
      })
    | null;
};

export default async function CleaningDetailPage({ params, searchParams }: PageProps<"/limpezas/[id]">) {
  const [{ id }, { de }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  // Everything in one go: the cleaning with its apartment's standard, plus
  // its checklist and problems.
  const [profile, { data: cleaning }, { data: tasks }, { data: issues }] = await Promise.all([
    requireUser(),
    supabase
      .from("cleanings")
      .select(
        "*, cleaner:profiles!cleanings_cleaner_id_fkey(id, full_name), property:properties(*, standard:property_standards(notes), linens:property_linens(*), ref_photos:property_reference_photos(*))",
      )
      .eq("id", id)
      .maybeSingle<CleaningDetail>(),
    supabase.from("cleaning_tasks").select("*").eq("cleaning_id", id).order("position").overrideTypes<CleaningTask[], { merge: false }>(),
    supabase.from("issues").select("*").eq("cleaning_id", id).order("created_at").overrideTypes<Issue[], { merge: false }>(),
  ]);
  if (!cleaning) notFound();

  const fromAdmin = de === "admin" && profile.role === "admin";
  const back = fromAdmin ? `/admin?dia=${cleaning.date}` : `/limpezas?dia=${cleaning.date}`;
  const standard = cleaning.property?.standard;
  const byPosition = <T extends { position: number }>(rows: T[] | undefined) =>
    [...(rows ?? [])].sort((a, b) => a.position - b.position);
  const linens = byPosition(cleaning.property?.linens);
  const refPhotos = byPosition(cleaning.property?.ref_photos);

  const photoUrls = await signedPhotoUrls([
    ...(tasks ?? []).map((t) => t.photo_path),
    ...(refPhotos ?? []).map((p) => p.path),
    ...(issues ?? []).flatMap((i) => [...i.photo_paths, ...i.resolution_photo_paths]),
  ]);
  const hasStandard = !!standard?.notes || !!linens?.length || !!refPhotos?.length;
  const inProgress = cleaning.status === "in_progress";
  const missing = (tasks ?? []).filter((t) => !t.done).length;
  const property = cleaning.property;
  const sameDay = cleaning.next_checkin === cleaning.date;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-20">
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
          {releaseText(cleaning) && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
              {releaseText(cleaning)}
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
          <p className="whitespace-pre-line">{cleaning.notes ?? scheduleLine(cleaning)}</p>
          {property?.access_instructions && (
            <p className="mt-1 whitespace-pre-line text-slate-600">Acesso: {property.access_instructions}</p>
          )}
        </div>
      </Card>

      {hasStandard && cleaning.status !== "completed" && (
        <details className="rounded-xl bg-surface shadow-sm ring-1 ring-slate-200" open={cleaning.status === "scheduled"}>
          <summary className="cursor-pointer px-4 py-3 font-semibold">Padrão deste apartamento</summary>
          <div className="space-y-3 px-4 pb-4 text-sm">
            {standard?.notes && <p className="whitespace-pre-line">{standard.notes}</p>}
            {linens && linens.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {linens.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="text-slate-700">{l.item}</span>
                    <span className="font-semibold tabular-nums">{l.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            {refPhotos && refPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {refPhotos.map((p) => {
                  const url = photoUrls.get(p.path);
                  return url ? (
                    <a key={p.id} href={url} target="_blank" rel="noreferrer" className="space-y-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                      <img src={url} alt={p.caption ?? ""} className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200" />
                      {p.caption && <span className="block text-[11px] text-slate-500">{p.caption}</span>}
                    </a>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </details>
      )}

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

      {issues && issues.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Problemas desta limpeza</h2>
          {issues.map((issue) => {
            const resolved = issue.status === "resolved";
            return (
              <div
                key={issue.id}
                className={`space-y-2 rounded-lg px-3 py-2 text-sm ring-1 ${
                  resolved ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"
                }`}
              >
                <p className={`font-medium ${resolved ? "text-emerald-700" : "text-red-800"}`}>
                  {resolved ? "✓" : "⚠"} {ISSUE_CATEGORY_LABELS[issue.category]}
                  {resolved && " · resolvido"}
                </p>
                <p>{issue.description}</p>
                {issue.resolution && <p className="text-emerald-700">{issue.resolution}</p>}
                <BeforeAfter
                  size="h-16 w-16"
                  before={issue.photo_paths.flatMap((p) => photoUrls.get(p) ?? [])}
                  after={issue.resolution_photo_paths.flatMap((p) => photoUrls.get(p) ?? [])}
                />
                {!resolved && <ResolveIssue issueId={issue.id} cleaningId={id} />}
              </div>
            );
          })}
        </Card>
      )}

      {(inProgress || cleaning.status === "scheduled") && <IssueSheet cleaningId={id} />}

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
