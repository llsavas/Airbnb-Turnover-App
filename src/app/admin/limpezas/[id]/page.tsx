import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfter } from "@/components/before-after";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { CLEANING_SELECT, listCleaners } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import {
  ISSUE_CATEGORY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  type CleaningTask,
  type CleaningWithRelations,
  type Issue,
} from "@/lib/types";
import { deleteCleaning, updateCleaning } from "../actions";

export const metadata: Metadata = { title: "Editar limpeza" };

export default async function EditCleaningPage({ params }: PageProps<"/admin/limpezas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: cleaning }, cleaners] = await Promise.all([
    supabase.from("cleanings").select(CLEANING_SELECT).eq("id", id).maybeSingle<CleaningWithRelations>(),
    listCleaners(),
  ]);
  if (!cleaning) notFound();

  const [{ data: taskRows }, { data: issueRows }] = await Promise.all([
    supabase.from("cleaning_tasks").select("*").eq("cleaning_id", id).order("position"),
    supabase.from("issues").select("*").eq("cleaning_id", id).order("created_at"),
  ]);
  const tasks = (taskRows ?? []) as CleaningTask[];
  const issues = (issueRows ?? []) as Issue[];
  const photoUrls = await signedPhotoUrls([
    ...tasks.map((t) => t.photo_path),
    ...issues.flatMap((i) => [...i.photo_paths, ...i.resolution_photo_paths]),
  ]);
  const photoTasks = tasks.filter((t) => t.photo_path);
  const pendingTasks = tasks.filter((t) => !t.done);

  return (
    <>
      <PageHeader title={cleaning.property?.name ?? "Limpeza"} />
      <div className="grid max-w-3xl gap-6 md:grid-cols-[1fr_16rem]">
        <Card>
          <ActionForm action={updateCleaning.bind(null, id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data">
                <Input name="date" type="date" defaultValue={cleaning.date} required />
              </Field>
              <Field label="Situação">
                <Select name="status" defaultValue={cleaning.status}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="A partir de">
                <Input name="starts_at" type="time" defaultValue={cleaning.starts_at?.slice(0, 5) ?? ""} />
              </Field>
              <Field label="Pronto até">
                <Input name="ends_at" type="time" defaultValue={cleaning.ends_at?.slice(0, 5) ?? ""} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Próximo check-in">
                <Input name="next_checkin" type="date" defaultValue={cleaning.next_checkin ?? ""} />
              </Field>
              <Field label="Hóspedes">
                <Input name="guest_count" type="number" min={1} defaultValue={cleaning.guest_count ?? ""} />
              </Field>
            </div>
            <Field label="Responsável">
              <Select name="cleaner_id" defaultValue={cleaning.cleaner_id ?? ""}>
                <option value="">Sem responsável</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observações para a equipe">
              <Textarea name="notes" defaultValue={cleaning.notes ?? ""} />
            </Field>
            <div className="flex gap-2">
              <SubmitButton>Salvar</SubmitButton>
              <Link href={`/admin/limpezas?semana=${cleaning.date}`} className={buttonClass("secondary")}>
                Voltar
              </Link>
            </div>
          </ActionForm>
        </Card>

        <aside className="space-y-4 text-sm">
          <Card className="space-y-2">
            <p>
              <span className="text-slate-500">Origem:</span> {SOURCE_LABELS[cleaning.source]}
            </p>
            {cleaning.started_at && (
              <p>
                <span className="text-slate-500">Iniciada:</span> {formatDateTime(cleaning.started_at)}
              </p>
            )}
            {cleaning.completed_at && (
              <p>
                <span className="text-slate-500">Concluída:</span> {formatDateTime(cleaning.completed_at)}
              </p>
            )}
          </Card>
          {cleaning.source === "manual" && (
            <form action={deleteCleaning.bind(null, id)}>
              <SubmitButton variant="danger" className="w-full" confirm="Excluir esta limpeza?">
                Excluir limpeza
              </SubmitButton>
            </form>
          )}
        </aside>
      </div>
      {(tasks.length > 0 || issues.length > 0) && (
        <section className="mt-8 max-w-3xl space-y-4">
          <h2 className="text-lg font-bold">Relatório da limpeza</h2>

          {tasks.length > 0 && (
            <Card>
              <h3 className="mb-2 font-semibold">
                Checklist: {tasks.length - pendingTasks.length} de {tasks.length} itens
              </h3>
              {pendingTasks.length > 0 && (
                <div className="mb-3 text-sm">
                  <p className="font-medium text-amber-800">Não marcados:</p>
                  <ul className="list-disc pl-5 text-slate-700">
                    {pendingTasks.map((t) => (
                      <li key={t.id}>
                        {t.room}: {t.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {photoTasks.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoTasks.map((t) => {
                    const url = photoUrls.get(t.photo_path!);
                    return (
                      <figure key={t.id}>
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                            <img src={url} alt={t.label} className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200" />
                          </a>
                        )}
                        <figcaption className="mt-1 text-xs text-slate-600">
                          {t.label}
                          {t.done_at && ` · ${formatDateTime(t.done_at)}`}
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {issues.length > 0 && (
            <Card className="space-y-3">
              <h3 className="font-semibold">Problemas reportados</h3>
              {issues.map((issue) => (
                <div key={issue.id} className="rounded-lg bg-red-50 p-3 text-sm">
                  <p className="font-medium text-red-800">
                    {ISSUE_CATEGORY_LABELS[issue.category]}
                    {issue.status === "resolved" && <span className="ml-2 text-emerald-700">(resolvido)</span>}
                  </p>
                  <p className="text-red-900">{issue.description}</p>
                  {issue.resolution && <p className="mt-1 text-emerald-700">Resolvido: {issue.resolution}</p>}
                  <div className="mt-2">
                    <BeforeAfter
                      before={issue.photo_paths.flatMap((p) => photoUrls.get(p) ?? [])}
                      after={issue.resolution_photo_paths.flatMap((p) => photoUrls.get(p) ?? [])}
                    />
                  </div>
                </div>
              ))}
              <Link href="/admin/problemas" className="text-sm font-medium text-brand-700">
                Ver todos os problemas →
              </Link>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
