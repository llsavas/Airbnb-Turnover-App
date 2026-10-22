import { Field, Input, Textarea } from "@/components/ui";
import type { ChecklistItem } from "@/lib/types";

export function ChecklistItemFields({ item, rooms }: { item?: ChecklistItem; rooms: string[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <Field label="Cômodo">
          <Input name="room" list="rooms" defaultValue={item?.room} required placeholder="Ex.: Banheiro" />
          <datalist id="rooms">
            {rooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Ordem" hint="Menor aparece antes">
          <Input name="position" type="number" defaultValue={item?.position ?? 500} />
        </Field>
      </div>
      <Field label="Tarefa">
        <Input name="label" defaultValue={item?.label} required placeholder="Ex.: Limpar o filtro do ar-condicionado" />
      </Field>
      <Field label="Dica para nota 5 (opcional)" hint="Aparece para a equipe ao tocar em ★ Dica.">
        <Textarea name="tip" defaultValue={item?.tip ?? ""} rows={2} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requires_photo" defaultChecked={item?.requires_photo} /> Exige foto
      </label>
    </>
  );
}
