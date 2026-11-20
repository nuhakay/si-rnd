import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { listProjects, projectNeedsAttention } from "@/lib/data/repo";
import { klDateString } from "@/lib/time";
import { ProjectStatusCard } from "@/components/dashboard/ProjectStatusCard";
import { PageHeader, EmptyState } from "@/components/ui";
import { PROJECT_STAGES } from "@/types";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requirePageUser("projects:read");
  const today = klDateString();
  const { projects, hiddenCount } = await listProjects(user);
  const byStage = PROJECT_STAGES.map((s) => ({ s, n: projects.filter((p) => p.stage === s).length })).filter((x) => x.n);
  return (
    <>
      <PageHeader title="R&D Project Portfolio" subtitle="Progress, health and next milestones. Percentages are demo estimates until authorised users enter verified values." />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {byStage.map(({ s, n }) => <span key={s} className="rounded-full border border-line px-2.5 py-1 text-muted">{s.toLowerCase()} · <span className="tabular text-cyan">{n}</span></span>)}
        {hiddenCount > 0 && <span className="rounded-full border border-amber/40 px-2.5 py-1 text-amber">{hiddenCount} project{hiddenCount > 1 ? "s" : ""} above your clearance hidden</span>}
      </div>
      {projects.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((p) => <ProjectStatusCard key={p.id} project={p} today={today} attention={projectNeedsAttention(p, today)} />)}
        </div>
      ) : <EmptyState>No projects visible to your role.</EmptyState>}
    </>
  );
}
