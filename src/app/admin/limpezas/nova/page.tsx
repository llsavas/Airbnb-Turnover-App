import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { listCleaners, listProperties } from "@/lib/data";
import { today } from "@/lib/dates";
import { createCleaning } from "../actions";

export const metadata: Metadata = { title: "Nova limpeza" };

export default async function NewCleaningPage() {
  const [properties, cleaners] = await Promise.all([listProperties(), listCleaners()]);

  return (
    <>
      <PageHeader title="Nova limpeza" />
      <Card className="max-w-lg">
        <ActionForm action={createCleaning} className="space-y-4">
          <Field label="Imóvel">
            <Select name="property_id" required defaultValue="">
              <option value="" disabled>
                Escolha o imóvel
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input name="date" type="date" defaultValue={today()} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="A partir de" hint="Vazio = checkout do imóvel">
              <Input name="starts_at" type="time" />
            </Field>
            <Field label="Pronto até" hint="Vazio = check-in do imóvel">
              <Input name="ends_at" type="time" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Próximo check-in">
              <Input name="next_checkin" type="date" />
            </Field>
            <Field label="Hóspedes">
              <Input name="guest_count" type="number" min={1} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Responsável">
            <Select name="cleaner_id" defaultValue="auto">
              <option value="auto">Responsável padrão do imóvel</option>
              <option value="">Sem responsável</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações para a equipe">
            <Textarea name="notes" />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Criar limpeza</SubmitButton>
            <Link href="/admin/limpezas" className={buttonClass("secondary")}>
              Cancelar
            </Link>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
