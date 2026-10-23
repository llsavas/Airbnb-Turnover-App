import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { listCleaners } from "@/lib/data";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Contractor } from "@/lib/types";
import { emailToLogin } from "@/lib/usernames";
import { createCleaner, createContractor, deleteContractor } from "./actions";

export const metadata: Metadata = { title: "Responsáveis" };

const TABS = [
  { id: "limpeza", label: "Limpeza" },
  { id: "manutencao", label: "Manutenção" },
] as const;

async function CleaningTeam() {
  const cleaners = await listCleaners({ includeInactive: true });
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  const logins = new Map(data.users.map((u) => [u.id, emailToLogin(u.email)]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        {cleaners.length === 0 ? (
          <EmptyState>Nenhuma pessoa cadastrada ainda.</EmptyState>
        ) : (
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {cleaners.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/admin/equipe/${c.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="truncate font-medium">
                    {c.full_name}
                    {!c.active && <span className="ml-2 text-xs text-slate-400">(inativa)</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    Usuário: {logins.get(c.id)}
                    {c.buildings.length > 0 && ` · ${c.buildings.join(", ")}`}
                  </p>
                </Link>
                <WhatsAppButton phone={c.phone} />
              </div>
            ))}
          </Card>
        )}
      </section>

      <Card>
        <h2 className="mb-1 font-semibold">Adicionar pessoa</h2>
        <p className="mb-4 text-sm text-slate-500">
          Ela vai entrar no app com o usuário e a senha que você definir aqui.
        </p>
        <ActionForm action={createCleaner} className="space-y-4">
          <Field label="Nome">
            <Input name="full_name" required />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input name="phone" type="tel" inputMode="tel" />
          </Field>
          <Field label="Usuário" hint="Ex.: maria.silva — ou um e-mail, se preferir.">
            <Input name="login" required autoCapitalize="none" autoComplete="off" />
          </Field>
          <Field label="Senha" hint="Mínimo de 6 caracteres.">
            <Input name="password" required minLength={6} autoComplete="new-password" />
          </Field>
          <SubmitButton className="w-full">Adicionar</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}

async function MaintenanceTeam() {
  const supabase = await createClient();
  const { data } = await supabase.from("contractors").select("*").order("name");
  const contractors = (data ?? []) as Contractor[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        {contractors.length === 0 ? (
          <EmptyState>Nenhum manutencista cadastrado ainda.</EmptyState>
        ) : (
          <Card className="divide-y divide-slate-100 p-0 sm:p-0">
            {contractors.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[c.specialty, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <WhatsAppButton phone={c.phone} />
                <form action={deleteContractor.bind(null, c.id)}>
                  <SubmitButton variant="danger" className="px-2.5 py-1.5 text-xs" confirm={`Excluir ${c.name}?`}>
                    Excluir
                  </SubmitButton>
                </form>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Card>
        <h2 className="mb-1 font-semibold">Adicionar manutencista</h2>
        <p className="mb-4 text-sm text-slate-500">Aparece para escolher ao agendar uma manutenção.</p>
        <ActionForm action={createContractor} className="space-y-4">
          <Field label="Nome">
            <Input name="name" required />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input name="phone" type="tel" inputMode="tel" placeholder="(51) 99999-0000" />
          </Field>
          <Field label="Especialidade">
            <Input name="specialty" placeholder="Ex.: Eletricista, encanador, ar-condicionado" />
          </Field>
          <SubmitButton className="w-full">Adicionar</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}

export default async function ResponsiblesPage({ searchParams }: PageProps<"/admin/equipe">) {
  const { aba } = await searchParams;
  const tab = aba === "manutencao" ? "manutencao" : "limpeza";
  return (
    <>
      <PageHeader title="Responsáveis" />
      <nav className="mb-5 inline-flex rounded-xl bg-surface p-1 ring-1 ring-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/equipe?aba=${t.id}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              tab === t.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "limpeza" ? <CleaningTeam /> : <MaintenanceTeam />}
    </>
  );
}
