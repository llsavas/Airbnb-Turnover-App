import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { listCleaners } from "@/lib/data";
import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Novo imóvel" };

export default async function NewPropertyPage() {
  const cleaners = await listCleaners();
  return (
    <>
      <PageHeader title="Novo imóvel" />
      <PropertyForm action={createProperty} cleaners={cleaners} />
    </>
  );
}
