import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { listLowStock } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";
import { createItem, markRestocked, updateItem } from "./actions";

export const metadata: Metadata = { title: "Estoque" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const [lowStock, { data: items }] = await Promise.all([
    listLowStock(),
    supabase.from("inventory_items").select("*").order("position").overrideTypes<InventoryItem[], { merge: false }>(),
  ]);
  const byProperty = [...new Set(lowStock.map((r) => r.property.id))].map((id) => ({
    property: lowStock.find((r) => r.property.id === id)!.property,
    rows: lowStock.filter((r) => r.property.id === id),
  }));

  return (
    <>
      <PageHeader title="Estoque" />

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Reposição necessária</h2>
        <p className="mb-3 text-sm text-slate-500">
          Itens abaixo do mínimo na última contagem feita pela equipe de limpeza.
        </p>
        {byProperty.length === 0 ? (
          <EmptyState>Nada em falta. 👍</EmptyState>
        ) : (
          <div className="space-y-3">
            {byProperty.map(({ property, rows }) => (
              <Card key={property.id} className="p-0 sm:p-0">
                <h3 className="border-b border-slate-100 px-4 py-3 font-semibold">{property.name}</h3>
                <ul className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <li key={r.item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{r.item.name}</p>
                        <p className="text-slate-500">
                          Tem {r.quantity} de {r.par} {r.item.unit}
                          {r.counted_at && ` · contado ${formatDateTime(r.counted_at)}`}
                        </p>
                      </div>
                      <form action={markRestocked.bind(null, r.property.id, r.item.id, r.par)}>
                        <SubmitButton variant="secondary">Reposto</SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Itens controlados</h2>
        <p className="mb-3 text-sm text-slate-500">
          A equipe conta estes itens em cada limpeza. O mínimo vale para todos os imóveis.
        </p>
        <Card className="divide-y divide-slate-100 p-0 sm:p-0">
          {(items ?? []).map((item) => (
            <ActionForm
              key={item.id}
              action={updateItem.bind(null, item.id)}
              className="grid grid-cols-[1fr_5rem_4.5rem] items-end gap-2 px-4 py-3 sm:grid-cols-[1fr_7rem_6rem_auto_auto]"
            >
              <Field label="Item">
                <Input name="name" defaultValue={item.name} required />
              </Field>
              <Field label="Unidade">
                <Input name="unit" defaultValue={item.unit} required />
              </Field>
              <Field label="Mínimo">
                <Input name="default_par" type="number" min={0} defaultValue={item.default_par} required />
              </Field>
              <label className="flex items-center gap-2 py-2.5 text-sm">
                <input type="checkbox" name="active" defaultChecked={item.active} /> Ativo
              </label>
              <SubmitButton variant="secondary">Salvar</SubmitButton>
            </ActionForm>
          ))}
        </Card>

        <Card className="mt-4">
          <h3 className="mb-3 font-semibold">Novo item</h3>
          <ActionForm action={createItem} className="grid grid-cols-[1fr_5rem_4.5rem] items-end gap-2 sm:grid-cols-[1fr_7rem_6rem_auto]">
            <Field label="Item">
              <Input name="name" required placeholder="Ex.: Água mineral" />
            </Field>
            <Field label="Unidade">
              <Input name="unit" defaultValue="un" required />
            </Field>
            <Field label="Mínimo">
              <Input name="default_par" type="number" min={0} defaultValue={1} required />
            </Field>
            <SubmitButton>Adicionar</SubmitButton>
          </ActionForm>
        </Card>
      </section>
    </>
  );
}
