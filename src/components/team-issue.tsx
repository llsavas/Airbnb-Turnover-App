import { BeforeAfter } from "@/components/before-after";
import { ResolveIssue } from "@/components/resolve-issue";
import { aptLabel } from "@/lib/buildings";
import type { IssueWithRelations } from "@/lib/types";

// A problem the admin addressed to the cleaning team: what to do, the photo
// and "Resolver" with an optional "after" photo.
export function TeamIssue({
  issue,
  photoUrls,
  showApartment = true,
}: {
  issue: IssueWithRelations;
  photoUrls: Map<string, string>;
  showApartment?: boolean;
}) {
  const urgent = issue.urgency === "urgent";
  return (
    <div className={`space-y-2 rounded-lg px-3 py-2 text-sm ring-1 ${urgent ? "bg-red-50 ring-red-200" : "bg-amber-50 ring-amber-200"}`}>
      <p className={`font-medium ${urgent ? "text-red-800" : "text-amber-800"}`}>
        🧽 {showApartment ? aptLabel(issue.property) : "Para a limpeza resolver"}
        {urgent && " · urgente"}
      </p>
      <p>{issue.description}</p>
      <BeforeAfter size="h-16 w-16" before={issue.photo_paths.flatMap((p) => photoUrls.get(p) ?? [])} after={[]} />
      <ResolveIssue issueId={issue.id} cleaningId={issue.cleaning_id} />
    </div>
  );
}
