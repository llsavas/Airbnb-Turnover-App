import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listProperties } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/types";
import { createChecklistItem } from "./actions";
import { ChecklistItemFields } from "./item-fields";

export const metadata: Metadata = { title: "Checklist" };

export default async function ChecklistPage({ searchParams }: PageProps<"/admin/checklist">) {
  const { imovel } = await searchParams;
  const propertyId = typeof imovel === "string" && imovel ? imovel : null;

  const supabase = await createClient();
  let query = supabase.from("checklist_items").select("*").order("position");
  query = propertyId ? query.eq("property_id", propertyId) : query.is("property_id", null);
  const [{ data }, properties, { data: allRooms }] = await Promise.all([
    query,
    listProperties(),
    supabase.from("checklist_items").select("room"),
  ]);
  const items = (data ?? []) as ChecklistItem[];
  const rooms = [...new Set([...items.map((i) => i.room)])];
  const roomSuggestions = [...new Set((allRooms ?? []).map((r: { room: string }) => r.room))];
  const propertyName = properties.find((p) => p.id === propertyId)?.name;

  return (
    <>
      <PageHeader title="Checklist" />

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <select
          name="imovel"
          defaultValue={propertyId ?? ""}
          className="min-w-0 flex-1 rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        >
          <option value="">Padrão (todos os imóveis)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              Extras de: {p.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-slate-300">Ver</button>
      </form>

      <p className="mb-4 text-sm text-slate-500">
        {propertyId
          ? `Itens extras só para ${propertyName}. Eles aparecem depois do checklist padrão.`
          : "Checklist usado em todas as limpezas. Para algo específico de um imóvel, escolha o imóvel acima."}{" "}
        Mudanças valem para as limpezas iniciadas a partir de agora.
      </p>

      {items.length === 0 ? (
        <EmptyState>Nenhum item ainda.</EmptyState>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room} className="p-0 sm:p-0">
              <h2 className="border-b border-slate-100 px-4 py-3 font-semibold">{room}</h2>
              <ul className="divide-y divide-slate-100">
                {items
                  .filter((i) => i.room === room)
                  .map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/checklist/${item.id}`}
                        className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                      >
                        <div className={item.active ? "" : "text-slate-400 line-through"}>
                          <p className="text-sm">{item.label}</p>
                          {item.tip && <p className="text-xs text-amber-700">★ {item.tip}</p>}
                        </div>
                        {item.requires_photo && (
                          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200">
                            Foto
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Novo item</h2>
        <ActionForm action={createChecklistItem.bind(null, propertyId)} className="space-y-4">
          <ChecklistItemFields rooms={roomSuggestions} />
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
