import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, buttonClass } from "@/components/ui";
import { buildingNames } from "@/lib/buildings";
import { listCleaners, listProperties } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/types";
import { updateProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Editar imóvel" };

export default async function EditPropertyPage({ params }: PageProps<"/admin/imoveis/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: property }, cleaners, properties] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle<Property>(),
    listCleaners(),
    listProperties({ includeInactive: true }),
  ]);
  if (!property) notFound();

  return (
    <>
      <PageHeader title={property.name}>
        <Link href={`/admin/imoveis/${id}/padrao`} className={buttonClass()}>
          Padrão do apartamento
        </Link>
      </PageHeader>
      <PropertyForm
        action={updateProperty.bind(null, id)}
        property={property}
        cleaners={cleaners}
        buildings={buildingNames(properties)}
      />
    </>
  );
}
