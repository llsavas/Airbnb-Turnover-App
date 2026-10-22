import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { listCleaners, listProperties } from "@/lib/data";

export const metadata: Metadata = { title: "Imóveis" };

export default async function PropertiesPage({ searchParams }: PageProps<"/admin/imoveis">) {
  const { q, inativos } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const showInactive = inativos === "1";

  const [properties, cleaners] = await Promise.all([
    listProperties({ includeInactive: showInactive }),
    listCleaners(),
  ]);
  const cleanerNames = new Map(cleaners.map((c) => [c.id, c.full_name]));
  const filtered = query
    ? properties.filter((p) =>
        [p.name, p.address, p.city].some((v) => v?.toLowerCase().includes(query)),
      )
    : properties;

  return (
    <>
      <PageHeader title={`Imóveis (${properties.length})`}>
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
          placeholder="Buscar por nome, endereço ou cidade"
          className="min-w-0 flex-1 rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        />
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
        <Card className="divide-y divide-slate-100 p-0 sm:p-0">
          {filtered.map((p) => (
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
      )}
    </>
  );
}
