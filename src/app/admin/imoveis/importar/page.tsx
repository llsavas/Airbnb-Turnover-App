import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, PageHeader, Textarea, buttonClass } from "@/components/ui";
import { importProperties } from "../actions";

export const metadata: Metadata = { title: "Importar imóveis" };

export default function ImportPropertiesPage() {
  return (
    <>
      <PageHeader title="Importar imóveis" />
      <Card>
        <p className="mb-3 text-sm text-slate-600">
          Cole um imóvel por linha, com as colunas separadas por ponto e vírgula (ou copie direto de
          uma planilha):
        </p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs">
          Nome; Endereço; Cidade; Link iCal (opcional){"\n"}
          Apto 302 Copacabana; Rua Barata Ribeiro, 100; Rio de Janeiro; https://www.airbnb.com/calendar/ical/123.ics
        </pre>
        <ActionForm action={importProperties} className="space-y-4">
          <Textarea name="rows" rows={12} required className="font-mono" />
          <div className="flex gap-2">
            <SubmitButton>Importar</SubmitButton>
            <Link href="/admin/imoveis" className={buttonClass("secondary")}>
              Voltar
            </Link>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
