import Image from "next/image";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1>
            <Image
              src="/logo.svg"
              alt="AirComplex"
              width={220}
              height={59}
              unoptimized
              priority
              className="mx-auto h-[59px] w-[220px]"
            />
            <span className="mt-3 block text-lg font-semibold">Cleaning 🧼</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de limpezas</p>
        </div>
        <ActionForm
          action={signIn}
          className="space-y-4 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-slate-200"
        >
          <Field label="Usuário ou e-mail">
            <Input name="login" autoComplete="username" autoCapitalize="none" required />
          </Field>
          <Field label="Senha">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full">Entrar</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
