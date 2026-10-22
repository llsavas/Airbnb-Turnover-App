import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { buildingNames } from "@/lib/buildings";
import { listCleaners, listProperties } from "@/lib/data";
import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Novo imóvel" };

export default async function NewPropertyPage() {
  const [cleaners, properties] = await Promise.all([listCleaners(), listProperties({ includeInactive: true })]);
  return (
    <>
      <PageHeader title="Novo imóvel" />
      <PropertyForm action={createProperty} cleaners={cleaners} buildings={buildingNames(properties)} />
    </>
  );
}
