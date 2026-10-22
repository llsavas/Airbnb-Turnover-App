import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, PageHeader, Select, buttonClass } from "@/components/ui";
import { NO_BUILDING, buildingNames, groupByBuilding } from "@/lib/buildings";
import { listCleaners, listProperties } from "@/lib/data";
import { importFromHospitable } from "../actions";
import { setBuildingCleaner } from "./actions";

export const metadata: Metadata = { title: "Imóveis" };
// "Importar do Hospitable" calls the Hospitable API.
export const maxDuration = 60;

export default async function PropertiesPage({ searchParams }: PageProps<"/admin/imoveis">) {
  const { q, inativos, predio } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const building = typeof predio === "string" ? predio : "";
  const showInactive = inativos === "1";

  const [properties, cleaners] = await Promise.all([
    listProperties({ includeInactive: showInactive }),
    listCleaners(),
  ]);
  const cleanerNames = new Map(cleaners.map((c) => [c.id, c.full_name]));
  const filtered = properties.filter(
    (p) =>
      (!building || (p.building ?? NO_BUILDING) === building) &&
      (!query || [p.name, p.building, p.address, p.city].some((v) => v?.toLowerCase().includes(query))),
  );
  const groups = groupByBuilding(filtered, (p) => p.building);

  return (
    <>
      <PageHeader title={`Imóveis (${properties.length})`}>
        <ActionForm action={importFromHospitable}>
          <SubmitButton variant="secondary">Importar do Hospitable</SubmitButton>
        </ActionForm>
        <Link href="/admin/imoveis/importar" className={buttonClass("secondary")}>
          Importar lista
        </Link>
        <Link href="/admin/imoveis/novo" className={buttonClass()}>
          Novo imóvel
        </Link>
      </PageHeader>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome, prédio ou endereço"
          className="min-w-0 flex-1 rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        />
        <Select name="predio" defaultValue={building} className="w-auto">
          <option value="">Todos os prédios</option>
          {[...buildingNames(properties), NO_BUILDING].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="inativos" value="1" defaultChecked={showInactive} />
          Mostrar inativos
        </label>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState>
          {properties.length === 0
            ? "Nenhum imóvel cadastrado ainda. Cadastre um a um ou importe a lista completa."
            : "Nenhum imóvel encontrado."}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const defaults = new Set(group.items.map((p) => p.default_cleaner_id));
            const shared = defaults.size === 1 ? [...defaults][0] : null;
            return (
              <section key={group.building}>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <h2 className="font-semibold">
                    {group.building}
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      {group.items.length} {group.items.length === 1 ? "apto" : "aptos"}
                    </span>
                  </h2>
                  {group.building !== NO_BUILDING && cleaners.length > 0 && (
                    <ActionForm
                      action={setBuildingCleaner.bind(null, group.building)}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <Select
                        name="cleaner_id"
                        defaultValue={shared ?? ""}
                        required
                        aria-label={`Responsável pelo prédio ${group.building}`}
                        className="w-auto py-1.5"
                      >
                        <option value="">Responsável do prédio…</option>
                        {cleaners.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variant="secondary" className="py-1.5">
                        Aplicar
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
                <Card className="divide-y divide-slate-100 p-0 sm:p-0">
                  {group.items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/imoveis/${p.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {p.name}
                          {!p.active && <span className="ml-2 text-xs text-slate-400">(inativo)</span>}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {[p.address, p.city].filter(Boolean).join(" · ") || "Sem endereço"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <p>{p.default_cleaner_id ? cleanerNames.get(p.default_cleaner_id) : "Sem responsável"}</p>
                        <p>
                          {p.hospitable_property_id ? "Hospitable" : p.ical_url ? "iCal" : "Sem sincronização"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
