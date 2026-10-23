import { DeleteIssue } from "@/components/delete-issue";
import { IssueCard } from "@/components/issue-card";
import { ResolveIssue } from "@/components/resolve-issue";
import { aptShort } from "@/lib/buildings";
import { formatDateTime } from "@/lib/dates";
import { ISSUE_CATEGORY_LABELS, type Issue, type IssueWithRelations } from "@/lib/types";

// An open problem for the team: the compact card, editable right there, with
// Resolver and Deletar behind the arrow.
export function TeamIssue({
  issue,
  photoUrls,
  title,
}: {
  issue: Issue | IssueWithRelations;
  photoUrls: Map<string, string>;
  // Defaults to the apartment.
  title?: string;
}) {
  return (
    <IssueCard
      issueId={issue.id}
      title={title ?? ("property" in issue ? aptShort(issue.property) : "")}
      createdAt={formatDateTime(issue.created_at)}
      description={issue.description}
      urgency={issue.urgency}
      team={issue.team}
      typeLabel={ISSUE_CATEGORY_LABELS[issue.category]}
      photos={issue.photo_paths.map((path) => ({ path, url: photoUrls.get(path) ?? "" }))}
      canChangeTeam={false}
    >
      <div className="flex flex-wrap items-start gap-2">
        <ResolveIssue issueId={issue.id} cleaningId={issue.cleaning_id} />
        <DeleteIssue issueId={issue.id} />
      </div>
    </IssueCard>
  );
}
