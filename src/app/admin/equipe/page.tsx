import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { listCleaners } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { emailToLogin } from "@/lib/usernames";
import { createCleaner } from "./actions";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  const cleaners = await listCleaners({ includeInactive: true });
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  const logins = new Map(data.users.map((u) => [u.id, emailToLogin(u.email)]));

  return (
    <>
      <PageHeader title="Equipe de limpeza" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          {cleaners.length === 0 ? (
            <EmptyState>Nenhuma pessoa cadastrada ainda.</EmptyState>
          ) : (
            <Card className="divide-y divide-slate-100 p-0 sm:p-0">
              {cleaners.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/equipe/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.full_name}
                      {!c.active && <span className="ml-2 text-xs text-slate-400">(inativa)</span>}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      Usuário: {logins.get(c.id)}
                      {c.phone && ` · ${c.phone}`}
                    </p>
                  </div>
                  <span className="text-sm text-brand-700">Editar</span>
                </Link>
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
    </>
  );
}
