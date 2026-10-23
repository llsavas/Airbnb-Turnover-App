import type { Metadata } from "next";
import { Card, EmptyState } from "@/components/ui";
import { TeamIssue } from "@/components/team-issue";
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
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Problemas para a limpeza</h1>
      {issues.length === 0 ? (
        <EmptyState>Nenhum problema pendente. 🎉</EmptyState>
      ) : (
        groupByBuilding(issues, (i) => i.property?.building).map((group) => (
          <Card key={group.building} className="space-y-3">
            <h2 className="font-semibold">{group.building}</h2>
            {group.items.map((issue) => (
              <TeamIssue key={issue.id} issue={issue} photoUrls={photoUrls} />
            ))}
          </Card>
        ))
      )}
    </div>
  );
}
