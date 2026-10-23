import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { listBuildingStock } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";
import { BuildingAccordion } from "../_painel/building-accordion";
import { createItem, markRestocked, saveBuildingMinimums, updateItem } from "./actions";

export const metadata: Metadata = { title: "Estoque" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const [stock, { data: items }] = await Promise.all([
    listBuildingStock(),
    supabase.from("inventory_items").select("*").order("position").overrideTypes<InventoryItem[], { merge: false }>(),
  ]);
  const low = (rows: (typeof stock)[number]["rows"]) => rows.filter((r) => r.quantity !== null && r.quantity < r.par);
  const needing = stock.filter((b) => low(b.rows).length > 0);

  return (
    <>
      <PageHeader title="Estoque por prédio" />

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Reposição necessária</h2>
        <p className="mb-3 text-sm text-slate-500">
          Itens abaixo do mínimo na última contagem da equipe no depósito de cada prédio.
        </p>
        {needing.length === 0 ? (
          <EmptyState>Nada em falta. 👍</EmptyState>
        ) : (
          <div className="space-y-3">
            {needing.map((b) => (
              <Card key={b.building} className="p-0 sm:p-0">
                <h3 className="border-b border-slate-100 px-4 py-3 font-semibold uppercase">{b.building}</h3>
                <ul className="divide-y divide-slate-100">
                  {low(b.rows).map((r) => (
                    <li key={r.item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{r.item.name}</p>
                        <p className="text-slate-500">
                          Tem {r.quantity} de {r.par} {r.item.unit}
                          {r.counted_at && ` · contado ${formatDateTime(r.counted_at)}`}
                        </p>
                      </div>
                      <form action={markRestocked.bind(null, b.building, r.item.id, r.par)}>
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

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Estoque e mínimos de cada prédio</h2>
        <p className="mb-3 text-sm text-slate-500">
          Se o mínimo ficar em branco, vale o mínimo por apartamento do item × número de apartamentos do prédio.
        </p>
        <div className="space-y-3">
          {stock.map((b) => (
            <BuildingAccordion
              key={b.building}
              building={b.building}
              done={b.rows.filter((r) => r.quantity !== null && r.quantity >= r.par).length}
              total={b.rows.length}
              doneLabel="itens ok"
            >
              <ActionForm action={saveBuildingMinimums.bind(null, b.building)} className="space-y-2 p-4">
                <div className="grid grid-cols-[1fr_4.5rem_5rem] gap-2 text-xs font-medium text-slate-500">
                  <span>Item ({b.apartments} aptos)</span>
                  <span className="text-center">Tem</span>
                  <span className="text-center">Mínimo</span>
                </div>
                {b.rows.map((r) => (
                  <div key={r.item.id} className="grid grid-cols-[1fr_4.5rem_5rem] items-center gap-2 text-sm">
                    <span>{r.item.name}</span>
                    <span
                      className={`text-center tabular-nums ${
                        r.quantity === null ? "text-slate-400" : r.quantity < r.par ? "font-semibold text-red-700" : ""
                      }`}
                    >
                      {r.quantity ?? "—"}
                    </span>
                    <Input
                      name={`par:${r.item.id}`}
                      type="number"
                      min={0}
                      defaultValue={r.customPar ?? ""}
                      placeholder={String(r.par)}
                      className="py-1.5 text-center"
                    />
                  </div>
                ))}
                <SubmitButton variant="secondary" className="mt-2">
                  Salvar mínimos
                </SubmitButton>
              </ActionForm>
            </BuildingAccordion>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Itens controlados</h2>
        <p className="mb-3 text-sm text-slate-500">A equipe conta estes itens no depósito do prédio.</p>
        <Card className="divide-y divide-slate-100 p-0 sm:p-0">
          {(items ?? []).map((item) => (
            <ActionForm
              key={item.id}
              action={updateItem.bind(null, item.id)}
              className="grid grid-cols-[1fr_5rem_4.5rem] items-end gap-2 px-4 py-3 sm:grid-cols-[1fr_7rem_7rem_auto_auto]"
            >
              <Field label="Item">
                <Input name="name" defaultValue={item.name} required />
              </Field>
              <Field label="Unidade">
                <Input name="unit" defaultValue={item.unit} required />
              </Field>
              <Field label="Mín./apto">
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
          <ActionForm action={createItem} className="grid grid-cols-[1fr_5rem_4.5rem] items-end gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
            <Field label="Item">
              <Input name="name" required placeholder="Ex.: Água mineral" />
            </Field>
            <Field label="Unidade">
              <Input name="unit" defaultValue="un" required />
            </Field>
            <Field label="Mín./apto">
              <Input name="default_par" type="number" min={0} defaultValue={1} required />
            </Field>
            <SubmitButton>Adicionar</SubmitButton>
          </ActionForm>
        </Card>
      </section>
    </>
  );
}
