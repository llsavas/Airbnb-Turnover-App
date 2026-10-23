import { EditableIssue } from "@/components/editable-issue";
import { ResolveIssue } from "@/components/resolve-issue";
import { aptLabel } from "@/lib/buildings";
import type { Issue, IssueWithRelations } from "@/lib/types";

// An open problem for the team: edited right on the card (text, urgency,
// photos) and "Resolver" with an optional "after" photo.
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
  const urgent = issue.urgency === "urgent";
  return (
    <div className={`space-y-2 rounded-lg px-3 py-2 text-sm ring-1 ${urgent ? "bg-red-50 ring-red-200" : "bg-amber-50 ring-amber-200"}`}>
      <p className={`font-medium ${urgent ? "text-red-800" : "text-amber-800"}`}>
        {issue.team === "cleaning" ? "🧽" : "⚠"} {title ?? ("property" in issue ? aptLabel(issue.property) : "")}
      </p>
      <EditableIssue
        issueId={issue.id}
        description={issue.description}
        urgency={issue.urgency}
        team={issue.team}
        photos={issue.photo_paths.map((path) => ({ path, url: photoUrls.get(path) ?? "" }))}
        canChangeTeam={false}
      />
      <ResolveIssue issueId={issue.id} cleaningId={issue.cleaning_id} />
    </div>
  );
}
