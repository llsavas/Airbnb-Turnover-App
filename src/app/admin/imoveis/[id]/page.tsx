import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { listCleaners } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/types";
import { updateProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Editar imóvel" };

export default async function EditPropertyPage({ params }: PageProps<"/admin/imoveis/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: property }, cleaners] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle<Property>(),
    listCleaners(),
  ]);
  if (!property) notFound();

  return (
    <>
      <PageHeader title={property.name} />
      <PropertyForm action={updateProperty.bind(null, id)} property={property} cleaners={cleaners} />
    </>
  );
}
