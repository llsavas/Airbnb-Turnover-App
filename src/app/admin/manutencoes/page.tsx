import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { aptLabel, groupByBuilding } from "@/lib/buildings";
import { listMaintenances, listProperties } from "@/lib/data";
import { addDays, formatDay, formatShortDate, formatTime, isValidDate, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ISSUE_CATEGORY_LABELS, type Contractor, type Issue, type MaintenanceWithProperty } from "@/lib/types";
import { createMaintenance, setMaintenanceStatus } from "./actions";

export const metadata: Metadata = { title: "Manutenções" };

function MaintenanceRow({ m, past }: { m: MaintenanceWithProperty; past?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <p className={`font-medium ${m.status !== "scheduled" ? "text-slate-500 line-through" : ""}`}>{m.title}</p>
        <p className="text-sm text-slate-500">
          {aptLabel(m.property)}
          {m.time && ` · ${formatTime(m.time)}`}
          {m.assignee && ` · ${m.assignee}`}
          {past && ` · ${formatShortDate(m.date)}`}
        </p>
        {m.description && <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{m.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {m.contractor?.phone && m.status === "scheduled" && <WhatsAppButton phone={m.contractor.phone} />}
        {m.status === "scheduled" ? (
          <>
            <form action={setMaintenanceStatus.bind(null, m.id, "done")}>
              <SubmitButton className="py-1.5">Feita</SubmitButton>
            </form>
            <form action={setMaintenanceStatus.bind(null, m.id, "cancelled")}>
              <SubmitButton variant="secondary" className="py-1.5" confirm="Cancelar esta manutenção?">
                Cancelar
              </SubmitButton>
            </form>
          </>
        ) : (
          <form action={setMaintenanceStatus.bind(null, m.id, "scheduled")}>
            <SubmitButton variant="secondary" className="py-1.5">
              Reabrir
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function MaintenancePage({ searchParams }: PageProps<"/admin/manutencoes">) {
  const { dia, problema } = await searchParams;
  const day = today();
  const supabase = await createClient();
  const [properties, upcoming, recent, { data: issue }, { data: contractorRows }] = await Promise.all([
    listProperties(),
    listMaintenances({ from: addDays(day, -60), to: addDays(day, 120), status: "scheduled" }),
    listMaintenances({ from: addDays(day, -30), to: addDays(day, 1) }),
    typeof problema === "string"
      ? supabase.from("issues").select("*").eq("id", problema).maybeSingle<Issue>()
      : Promise.resolve({ data: null }),
    supabase.from("contractors").select("*").eq("active", true).order("name"),
  ]);
  const contractors = (contractorRows ?? []) as Contractor[];
  const overdue = upcoming.filter((m) => m.date < day);
  const scheduled = upcoming.filter((m) => m.date >= day);
  const days = [...new Set(scheduled.map((m) => m.date))];
  const finished = recent.filter((m) => m.status !== "scheduled").reverse().slice(0, 15);

  return (
    <>
      <PageHeader title="Manutenções" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold text-red-700">Atrasadas</h2>
              <Card className="divide-y divide-slate-100 p-0 sm:p-0">
                {overdue.map((m) => (
                  <MaintenanceRow key={m.id} m={m} past />
                ))}
              </Card>
            </section>
          )}
          {days.length === 0 ? (
            <EmptyState>Nenhuma manutenção agendada.</EmptyState>
          ) : (
            days.map((d) => (
              <section key={d}>
                <h2 className={`mb-2 font-semibold capitalize ${d === day ? "text-brand-700" : ""}`}>
                  {formatDay(d)}
                  {d === day && " · hoje"}
                </h2>
                <Card className="divide-y divide-slate-100 p-0 sm:p-0">
                  {scheduled
                    .filter((m) => m.date === d)
                    .map((m) => (
                      <MaintenanceRow key={m.id} m={m} />
                    ))}
                </Card>
              </section>
            ))
          )}
          {finished.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold text-slate-500">Feitas e canceladas (últimos 30 dias)</h2>
              <Card className="divide-y divide-slate-100 p-0 sm:p-0">
                {finished.map((m) => (
                  <MaintenanceRow key={m.id} m={m} past />
                ))}
              </Card>
            </section>
          )}
        </div>

        <Card className="h-fit">
          <h2 className="mb-3 font-semibold">Agendar manutenção</h2>
          {issue && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              Para o problema: {ISSUE_CATEGORY_LABELS[issue.category]} — {issue.description}
            </p>
          )}
          <ActionForm action={createMaintenance} className="space-y-4">
            {issue && <input type="hidden" name="issue_id" value={issue.id} />}
            <Field label="Imóvel">
              <Select name="property_id" required defaultValue={issue?.property_id ?? ""}>
                <option value="">Escolha…</option>
                {groupByBuilding(properties, (p) => p.building).map((g) => (
                  <optgroup key={g.building} label={g.building}>
                    {g.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <Input
                  name="date"
                  type="date"
                  required
                  defaultValue={typeof dia === "string" && isValidDate(dia) ? dia : day}
                />
              </Field>
              <Field label="Horário">
                <Input name="time" type="time" />
              </Field>
            </div>
            <Field label="O que fazer">
              <Input
                name="title"
                required
                defaultValue={issue ? issue.description.slice(0, 80) : ""}
                placeholder="Ex.: Trocar resistência do chuveiro"
              />
            </Field>
            {contractors.length > 0 && (
              <Field label="Manutencista">
                <Select name="contractor_id" defaultValue="">
                  <option value="">Nenhum / outro</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.specialty && ` (${c.specialty})`}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field
              label={contractors.length ? "Ou quem vai fazer" : "Quem vai fazer"}
              hint="Cadastre manutencistas em Responsáveis → Manutenção."
            >
              <Input name="assignee" placeholder="Ex.: João eletricista (51) 99999-0000" />
            </Field>
            <Field label="Detalhes">
              <Textarea name="description" />
            </Field>
            <SubmitButton className="w-full">Agendar</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
