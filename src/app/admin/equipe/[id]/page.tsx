import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, buttonClass } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { emailToLogin } from "@/lib/usernames";
import { updateCleaner } from "../actions";

export const metadata: Metadata = { title: "Editar pessoa" };

export default async function EditCleanerPage({ params }: PageProps<"/admin/equipe/[id]">) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: cleaner } = await admin
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .eq("id", id)
    .eq("role", "cleaner")
    .maybeSingle<Profile>();
  if (!cleaner) notFound();
  const { data: auth } = await admin.auth.admin.getUserById(id);

  return (
    <>
      <PageHeader title={cleaner.full_name} />
      <Card className="max-w-lg">
        <ActionForm action={updateCleaner.bind(null, id)} className="space-y-4">
          <p className="text-sm text-slate-500">
            Usuário: <strong className="text-slate-800">{emailToLogin(auth.user?.email)}</strong>
          </p>
          <Field label="Nome">
            <Input name="full_name" defaultValue={cleaner.full_name} required />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input name="phone" type="tel" defaultValue={cleaner.phone ?? ""} />
          </Field>
          <Field label="Nova senha" hint="Deixe em branco para manter a senha atual.">
            <Input name="password" minLength={6} autoComplete="new-password" />
          </Field>
          <Field label="Situação">
            <Select name="active" defaultValue={cleaner.active ? "on" : "off"}>
              <option value="on">Ativa</option>
              <option value="off">Inativa (não consegue entrar no app)</option>
            </Select>
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Salvar</SubmitButton>
            <Link href="/admin/equipe" className={buttonClass("secondary")}>
              Cancelar
            </Link>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
