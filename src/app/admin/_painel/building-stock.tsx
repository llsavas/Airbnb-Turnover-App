import { ActionForm, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui";
import type { BuildingStock } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { saveBuildingStock } from "../../limpezas/actions";

// "Estoque do prédio" at the top of a building block: the team counts the
// building's supply room once, for all its apartments.
export function BuildingStockForm({ stock }: { stock: BuildingStock }) {
  const low = stock.rows.filter((r) => r.quantity !== null && r.quantity < r.par).length;
  const lastCount = stock.rows
    .map((r) => r.counted_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  return (
    <details className="rounded-xl bg-slate-50 ring-1 ring-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">📦 Estoque do prédio</span>
        <span className="text-xs text-slate-500">
          {low > 0 ? (
            <span className="font-semibold text-red-700">{low} em falta</span>
          ) : lastCount ? (
            `contado ${formatDateTime(lastCount)}`
          ) : (
            "ainda não contado"
          )}
        </span>
      </summary>
      <ActionForm action={saveBuildingStock.bind(null, stock.building)} className="space-y-2 px-4 pb-4">
        <p className="text-sm text-slate-500">Quanto tem no depósito agora (mínimo entre parênteses).</p>
        {stock.rows.map((r) => (
          <label key={r.item.id} className="flex items-center justify-between gap-3">
            <span className={`text-[15px] ${r.quantity !== null && r.quantity < r.par ? "text-red-700" : ""}`}>
              {r.item.name} <span className="text-xs text-slate-500">({r.par})</span>
            </span>
            <div className="w-20 shrink-0">
              <Input
                name={`item:${r.item.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={r.quantity ?? ""}
                className="text-center"
              />
            </div>
          </label>
        ))}
        <SubmitButton variant="secondary" className="mt-2 w-full">
          Salvar estoque
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
