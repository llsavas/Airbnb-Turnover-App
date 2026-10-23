import type { Metadata } from "next";
import { IssueBuildingGroup } from "@/components/issue-groups";
import { TeamIssue } from "@/components/team-issue";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { groupByBuilding, inBuildings } from "@/lib/buildings";
import { listCleaningTeamIssues } from "@/lib/data";
import { signedPhotoUrls } from "@/lib/photos";

export const metadata: Metadata = { title: "Problemas" };

// Problems the admin left for the cleaning team, in this person's buildings.
export default async function TeamIssuesPage() {
  const [profile, all] = await Promise.all([requireUser(), listCleaningTeamIssues()]);
  const issues = all
    .filter((i) => inBuildings(profile.buildings, i.property?.building))
    .sort((a, b) => Number(b.urgency === "urgent") - Number(a.urgency === "urgent"));
  const photoUrls = await signedPhotoUrls(issues.flatMap((i) => i.photo_paths));

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="mb-2 text-xl font-bold">
        Problemas <span className="text-slate-500 tabular-nums">({issues.length})</span>
      </h1>
      {issues.length === 0 ? (
        <EmptyState>Nenhum problema pendente. 🎉</EmptyState>
      ) : (
        groupByBuilding(issues, (i) => i.property?.building).map((group) => (
          <IssueBuildingGroup
            key={group.building}
            building={group.building}
            count={group.items.length}
            urgent={group.items.filter((i) => i.urgency === "urgent").length}
          >
            {group.items.map((issue) => (
              <TeamIssue key={issue.id} issue={issue} photoUrls={photoUrls} />
            ))}
          </IssueBuildingGroup>
        ))
      )}
    </div>
  );
}
