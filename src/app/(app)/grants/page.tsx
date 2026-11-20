import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { listGrants, listProjects } from "@/lib/data/repo";
import { klDateString, formatKlDate, relativeDue } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { Badge, ClassificationBadge, DemoBadge, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Research Grants" };
const OUTCOME_TONE = { NOT_SUBMITTED: "muted", SUBMITTED: "royal", UNDER_EVALUATION: "amber", AWARDED: "teal", UNSUCCESSFUL: "danger" } as const;

export default async function GrantsPage() {
  const user = await requirePageUser("grants:read");
  const today = klDateString();
  const [{ grants, hiddenCount }, { projects }] = await Promise.all([listGrants(user), listProjects(user)]);
  return (
    <>
      <PageHeader title="Research Grants & Funding" subtitle="Programmes, deadlines, eligibility, documents and outcomes. Programme names and amounts are placeholders until verified against official guidelines." />
      {hiddenCount > 0 && <p className="mb-3 text-xs text-amber">{hiddenCount} confidential grant record{hiddenCount > 1 ? "s" : ""} hidden for your role.</p>}
      {grants.length === 0 ? <EmptyState>No grants visible.</EmptyState> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grants.map((g) => {
            const done = g.requiredDocuments.filter((d) => d.done).length;
            return (
              <HolographicPanel key={g.id} bodyClassName="space-y-3">
                <div className="flex items-start gap-3">
                  <ProgressRing value={g.progress} size={60} label="Submission progress" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5"><Badge tone={OUTCOME_TONE[g.outcome]}>{g.outcome.replace("_", " ")}</Badge><ClassificationBadge value={g.classification} />{g.isDemo && <DemoBadge />}</div>
                    <h2 className="mt-1 font-medium text-ink">{g.programme}</h2>
                    <p className="text-xs text-muted">{g.agency}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">Deadline</dt><dd className="text-ink">{formatKlDate(g.deadline)} <span className="text-xs text-muted">({relativeDue(g.deadline, today)})</span></dd>
                  <dt className="text-muted">Requested funding</dt><dd className="text-ink">{g.requestedFunding ?? <span className="text-muted">To be entered</span>}</dd>
                  <dt className="text-muted">Eligibility</dt><dd className="text-ink">{g.eligibility}</dd>
                  <dt className="text-muted">Owner</dt><dd className="text-ink">{g.ownerName}</dd>
                  <dt className="text-muted">Linked project</dt><dd className="text-ink">{projects.find((p) => p.id === g.projectId)?.code ?? "—"}</dd>
                </dl>
                <div>
                  <p className="hud-label mb-1">Required documents · {done}/{g.requiredDocuments.length}</p>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">{g.requiredDocuments.map((d) => <li key={d.name} className={d.done ? "text-teal" : "text-muted"}>{d.done ? "✓" : "○"} <span className="text-ink">{d.name}</span></li>)}</ul>
                </div>
              </HolographicPanel>
            );
          })}
        </div>
      )}
    </>
  );
}
