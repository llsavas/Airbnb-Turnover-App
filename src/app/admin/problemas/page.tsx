import type { Metadata } from "next";
import Link from "next/link";
import { BeforeAfter } from "@/components/before-after";
import { EditableIssue } from "@/components/editable-issue";
import { SubmitButton } from "@/components/forms";
import { ResolveIssue } from "@/components/resolve-issue";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { aptLabel } from "@/lib/buildings";
import { listIssues, listProperties } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { ISSUE_CATEGORY_LABELS, ISSUE_TEAM_LABELS, ISSUE_URGENCY_LABELS, type IssueUrgency } from "@/lib/types";
import { reopenIssue } from "./actions";
import { IssueComposer } from "./issue-composer";

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
  const [issues, apartments] = await Promise.all([listIssues(resolved ? "resolved" : "open"), listProperties()]);
  if (!resolved) issues.sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency));
  const photoUrls = await signedPhotoUrls(issues.flatMap((i) => [...i.photo_paths, ...i.resolution_photo_paths]));
  const urls = (paths: string[]) => paths.flatMap((p) => (photoUrls.get(p) ? [photoUrls.get(p)!] : []));

  return (
    <>
      <PageHeader title="Problemas" />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <nav className="flex shrink-0 gap-2">
          <Link
            href="/admin/problemas"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${!resolved ? "bg-brand-700 text-white" : "text-slate-600 ring-1 ring-slate-300"}`}
          >
            Abertos
          </Link>
          <Link
            href="/admin/problemas?status=resolvidos"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${resolved ? "bg-brand-700 text-white" : "text-slate-600 ring-1 ring-slate-300"}`}
          >
            Resolvidos
          </Link>
        </nav>
        <IssueComposer apartments={apartments.map((a) => ({ id: a.id, name: a.name, building: a.building }))} />
      </div>

      {issues.length === 0 ? (
        <EmptyState>{resolved ? "Nenhum problema resolvido ainda." : "Nenhum problema aberto. 🎉"}</EmptyState>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{aptLabel(issue.property)}</p>
                  <p className="text-sm text-slate-500">
                    {issue.team
                      ? `${issue.team === "maintenance" ? "🔧" : "🧽"} ${ISSUE_TEAM_LABELS[issue.team]}`
                      : ISSUE_CATEGORY_LABELS[issue.category]}{" "}
                    · {issue.reporter?.full_name || "—"} · {formatDateTime(issue.created_at)}
                  </p>
                </div>
                {resolved && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${urgencyStyles[issue.urgency]}`}
                  >
                    {ISSUE_URGENCY_LABELS[issue.urgency]}
                  </span>
                )}
              </div>
              {resolved ? (
                <>
                  <p className="whitespace-pre-line">{issue.description}</p>
                  <BeforeAfter before={urls(issue.photo_paths)} after={urls(issue.resolution_photo_paths)} />
                </>
              ) : (
                <EditableIssue
                  issueId={issue.id}
                  description={issue.description}
                  urgency={issue.urgency}
                  team={issue.team}
                  photos={issue.photo_paths.map((path) => ({ path, url: photoUrls.get(path) ?? "" }))}
                  canChangeTeam
                />
              )}
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                {issue.cleaning_id && (
                  <Link href={`/admin/limpezas/${issue.cleaning_id}`} className="text-brand-700">
                    Ver limpeza →
                  </Link>
                )}
                {!resolved && (
                  <Link href={`/admin/manutencoes?problema=${issue.id}`} className="text-brand-700">
                    Agendar manutenção →
                  </Link>
                )}
              </div>
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
                <div className="border-t border-slate-100 pt-3">
                  <ResolveIssue issueId={issue.id} cleaningId={issue.cleaning_id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
