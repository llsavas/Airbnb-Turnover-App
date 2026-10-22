import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, PageHeader, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/types";
import { deleteChecklistItem, updateChecklistItem } from "../actions";
import { ChecklistItemFields } from "../item-fields";

export const metadata: Metadata = { title: "Editar item do checklist" };

export default async function EditChecklistItemPage({ params }: PageProps<"/admin/checklist/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: item }, { data: allRooms }] = await Promise.all([
    supabase.from("checklist_items").select("*").eq("id", id).maybeSingle<ChecklistItem>(),
    supabase.from("checklist_items").select("room"),
  ]);
  if (!item) notFound();
  const rooms = [...new Set((allRooms ?? []).map((r: { room: string }) => r.room))];
  const back = item.property_id ? `/admin/checklist?imovel=${item.property_id}` : "/admin/checklist";

  return (
    <>
      <PageHeader title="Editar item" />
      <div className="max-w-xl space-y-4">
        <Card>
          <ActionForm action={updateChecklistItem.bind(null, id, item.property_id)} className="space-y-4">
            <ChecklistItemFields item={item} rooms={rooms} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={item.active} /> Ativo
            </label>
            <div className="flex gap-2">
              <SubmitButton>Salvar</SubmitButton>
              <Link href={back} className={buttonClass("secondary")}>
                Voltar
              </Link>
            </div>
          </ActionForm>
        </Card>
        <form action={deleteChecklistItem.bind(null, id, item.property_id)}>
          <SubmitButton variant="danger" confirm="Excluir este item do checklist?">
            Excluir item
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
