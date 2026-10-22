import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { CLEANING_SELECT, listCleaners } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_LABELS, STATUS_LABELS, type CleaningWithRelations } from "@/lib/types";
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
    </>
  );
}
