import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { listIssues } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { ISSUE_CATEGORY_LABELS, ISSUE_URGENCY_LABELS, type IssueUrgency } from "@/lib/types";
import { reopenIssue, resolveIssue } from "./actions";

export const metadata: Metadata = { title: "Problemas" };

const urgencyStyles: Record<IssueUrgency, string> = {
  urgent: "bg-red-50 text-red-700 ring-red-200",
  normal: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

const URGENCY_ORDER: IssueUrgency[] = ["urgent", "normal", "low"];

export default async function IssuesPage({ searchParams }: PageProps<"/admin/problemas">) {
  const { status } = await searchParams;
  const resolved = status === "resolvidos";
  const issues = await listIssues(resolved ? "resolved" : "open");
  if (!resolved) issues.sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency));
  const photoUrls = await signedPhotoUrls(issues.flatMap((i) => i.photo_paths));

  return (
    <>
      <PageHeader title="Problemas">
        <Link
          href="/admin/problemas"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${!resolved ? "bg-slate-900 text-white" : "text-slate-600 ring-1 ring-slate-300"}`}
        >
          Abertos
        </Link>
        <Link
          href="/admin/problemas?status=resolvidos"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${resolved ? "bg-slate-900 text-white" : "text-slate-600 ring-1 ring-slate-300"}`}
        >
          Resolvidos
        </Link>
      </PageHeader>

      {issues.length === 0 ? (
        <EmptyState>{resolved ? "Nenhum problema resolvido ainda." : "Nenhum problema aberto. 🎉"}</EmptyState>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{issue.property?.name}</p>
                  <p className="text-sm text-slate-500">
                    {ISSUE_CATEGORY_LABELS[issue.category]} · {issue.reporter?.full_name ?? "—"} ·{" "}
                    {formatDateTime(issue.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${urgencyStyles[issue.urgency]}`}
                >
                  {ISSUE_URGENCY_LABELS[issue.urgency]}
                </span>
              </div>
              <p className="whitespace-pre-line">{issue.description}</p>
              {issue.photo_paths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {issue.photo_paths.map((path) => {
                    const url = photoUrls.get(path);
                    return url ? (
                      <a key={path} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                        <img src={url} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200" />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
              {issue.cleaning_id && (
                <Link href={`/admin/limpezas/${issue.cleaning_id}`} className="text-sm font-medium text-brand-700">
                  Ver limpeza →
                </Link>
              )}
              {resolved ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                  <p className="text-emerald-700">
                    Resolvido {issue.resolved_at && `em ${formatDateTime(issue.resolved_at)}`}
                    {issue.resolution && `: ${issue.resolution}`}
                  </p>
                  <form action={reopenIssue.bind(null, issue.id)}>
                    <SubmitButton variant="secondary">Reabrir</SubmitButton>
                  </form>
                </div>
              ) : (
                <ActionForm action={resolveIssue.bind(null, issue.id)} className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Input name="resolution" placeholder="O que foi feito? (opcional)" className="min-w-0 flex-1" />
                  <SubmitButton>Marcar resolvido</SubmitButton>
                </ActionForm>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
