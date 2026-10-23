import type { Metadata } from "next";
import Link from "next/link";
import { BeforeAfter } from "@/components/before-after";
import { DeleteIssue } from "@/components/delete-issue";
import { SubmitButton } from "@/components/forms";
import { IssueCard } from "@/components/issue-card";
import { IssueBuildingGroup } from "@/components/issue-groups";
import { ResolveIssue } from "@/components/resolve-issue";
import { EmptyState } from "@/components/ui";
import { aptShort, groupByBuilding } from "@/lib/buildings";
import { countOpenIssues, listIssues, listProperties } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { signedPhotoUrls } from "@/lib/photos";
import { ISSUE_CATEGORY_LABELS, type IssueUrgency } from "@/lib/types";
import { reopenIssue } from "./actions";
import { IssueComposer } from "./issue-composer";

export const metadata: Metadata = { title: "Problemas" };

const URGENCY_ORDER: IssueUrgency[] = ["urgent", "normal", "low"];

export default async function IssuesPage({ searchParams }: PageProps<"/admin/problemas">) {
  const { status } = await searchParams;
  const resolved = status === "resolvidos";
  const [issues, apartments, openCount] = await Promise.all([
    listIssues(resolved ? "resolved" : "open"),
    listProperties(),
    resolved ? countOpenIssues() : Promise.resolve(null),
  ]);
  if (!resolved) issues.sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency));
  const pending = openCount ?? issues.length;
  const photoUrls = await signedPhotoUrls(issues.flatMap((i) => [...i.photo_paths, ...i.resolution_photo_paths]));
  const photos = (paths: string[]) => paths.map((path) => ({ path, url: photoUrls.get(path) ?? "" }));
  const urls = (paths: string[]) => paths.flatMap((p) => photoUrls.get(p) ?? []);

  return (
    <>
      <h1 className="mb-5 text-xl font-bold text-slate-900 sm:text-2xl">
        Problemas <span className="text-slate-500 tabular-nums">({pending})</span>
      </h1>
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
          {groupByBuilding(issues, (i) => i.property?.building).map((group) => (
            <IssueBuildingGroup
              key={group.building}
              building={group.building}
              count={group.items.length}
              urgent={resolved ? 0 : group.items.filter((i) => i.urgency === "urgent").length}
            >
              {group.items.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issueId={issue.id}
                  title={aptShort(issue.property)}
                  createdAt={formatDateTime(issue.created_at)}
                  description={issue.description}
                  urgency={issue.urgency}
                  team={issue.team}
                  typeLabel={ISSUE_CATEGORY_LABELS[issue.category]}
                  photos={photos(resolved && issue.resolution_photo_paths.length ? issue.resolution_photo_paths : issue.photo_paths)}
                  canChangeTeam
                  readOnly={resolved}
                  note={
                    resolved &&
                    `✓ Resolvido${issue.resolved_at ? ` em ${formatDateTime(issue.resolved_at)}` : ""}${issue.resolution ? `: ${issue.resolution}` : ""}`
                  }
                >
                  <p className="text-xs text-slate-500">Enviado por {issue.reporter?.full_name || "—"}</p>
                  {resolved && <BeforeAfter size="h-16 w-16" before={urls(issue.photo_paths)} after={urls(issue.resolution_photo_paths)} />}
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
                    <form action={reopenIssue.bind(null, issue.id)}>
                      <SubmitButton variant="secondary">Reabrir</SubmitButton>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-start gap-2">
                      <ResolveIssue issueId={issue.id} cleaningId={issue.cleaning_id} />
                      <DeleteIssue issueId={issue.id} />
                    </div>
                  )}
                </IssueCard>
              ))}
            </IssueBuildingGroup>
          ))}
        </div>
      )}
    </>
  );
}
