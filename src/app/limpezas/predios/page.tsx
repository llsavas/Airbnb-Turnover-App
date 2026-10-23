import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { groupByBuilding } from "@/lib/buildings";
import { listProperties } from "@/lib/data";
import { saveMyBuildings } from "./actions";

export const metadata: Metadata = { title: "Escolha os prédios" };

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-500" aria-hidden>
      <path d="M4 21V8l8-4 8 4v13M4 21h16M9 21v-4h6v4M8 11h2M14 11h2M8 14h2M14 14h2" />
    </svg>
  );
}

export default async function ChooseBuildingsPage() {
  const profile = await requireUser();
  const groups = groupByBuilding(await listProperties(), (p) => p.building);
  const selected = new Set(profile.buildings);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold">Escolha os prédios</h1>
      <p className="mb-4 text-sm text-slate-500">
        Você pode selecionar mais de um prédio. Verá as limpezas apenas deles.
      </p>
      <ActionForm action={saveMyBuildings} className="space-y-2">
        {groups.map((g) => (
          <label
            key={g.building}
            className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-slate-200 has-[:checked]:ring-2 has-[:checked]:ring-brand-600"
          >
            <input
              type="checkbox"
              name="buildings"
              value={g.building}
              defaultChecked={selected.has(g.building)}
              className="h-4 w-4"
            />
            <BuildingIcon />
            <span className="flex-1 font-semibold uppercase">{g.building}</span>
            <span className="text-xs text-slate-500">{g.items.length} un.</span>
          </label>
        ))}
        <div className="sticky bottom-0 bg-slate-50 pt-2 pb-4">
          <SubmitButton className="w-full py-3">Ver limpezas</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
