import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import type { FormState } from "@/lib/form";
import type { Profile, Property } from "@/lib/types";

export function PropertyForm({
  action,
  property,
  cleaners,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  property?: Property;
  cleaners: Profile[];
}) {
  return (
    <ActionForm action={action} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="font-semibold">Dados do imóvel</h2>
        <Field label="Nome">
          <Input name="name" defaultValue={property?.name} required placeholder="Ex.: Apto 302 Copacabana" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Endereço">
            <Input name="address" defaultValue={property?.address ?? ""} />
          </Field>
          <Field label="Cidade">
            <Input name="city" defaultValue={property?.city ?? ""} />
          </Field>
        </div>
        <Field
          label="Instruções de acesso"
          hint="Visível para a equipe de limpeza: senha da fechadura, onde fica a chave, portaria…"
        >
          <Textarea name="access_instructions" defaultValue={property?.access_instructions ?? ""} />
        </Field>
        <Field label="Observações">
          <Textarea name="notes" defaultValue={property?.notes ?? ""} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Limpeza</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Horário de checkout">
            <Input name="checkout_time" type="time" defaultValue={property?.checkout_time.slice(0, 5) ?? "11:00"} />
          </Field>
          <Field label="Horário de check-in">
            <Input name="checkin_time" type="time" defaultValue={property?.checkin_time.slice(0, 5) ?? "15:00"} />
          </Field>
        </div>
        <Field label="Responsável padrão" hint="Novas limpezas deste imóvel vão para esta pessoa.">
          <Select name="default_cleaner_id" defaultValue={property?.default_cleaner_id ?? ""}>
            <option value="">Ninguém (atribuir manualmente)</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Sincronização de reservas</h2>
        <p className="text-sm text-slate-500">
          Use o Hospitable ou o iCal (Airbnb, Booking…) para criar as limpezas automaticamente após
          cada checkout.
        </p>
        <Field label="ID do imóvel no Hospitable">
          <Input name="hospitable_property_id" defaultValue={property?.hospitable_property_id ?? ""} />
        </Field>
        <Field label="Link do calendário iCal" hint="Ex.: Airbnb → Calendário → Exportar calendário">
          <Input name="ical_url" type="url" inputMode="url" defaultValue={property?.ical_url ?? ""} placeholder="https://" />
        </Field>
        {property && (
          <Field label="Situação">
            <Select name="active" defaultValue={property.active ? "on" : "off"}>
              <option value="on">Ativo</option>
              <option value="off">Inativo (não aparece nas listas)</option>
            </Select>
          </Field>
        )}
      </Card>

      <div className="flex gap-2">
        <SubmitButton>{property ? "Salvar" : "Cadastrar imóvel"}</SubmitButton>
        <Link href="/admin/imoveis" className={buttonClass("secondary")}>
          Cancelar
        </Link>
      </div>
    </ActionForm>
  );
}
