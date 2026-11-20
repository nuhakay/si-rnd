import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listProjects, projectNeedsAttention } from "@/lib/data/repo";
import { klDateString } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { ReportDraft } from "@/components/modules/ReportDraft";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { EmptyState, HealthDot, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const user = await requirePageUser("dashboard:view");
  if (!can(user.role, "reports:read") && !can(user.role, "reports:generate")) redirect("/dashboard?denied=1");
  const { draft } = await searchParams;
  const today = klDateString();
  const { projects } = await listProjects(user);
  return (
    <>
      <PageHeader title="Reports" subtitle="Portfolio summary and weekly report drafts. Drafts must be reviewed by the R&D Manager before circulation." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <HolographicPanel title="Portfolio summary">
          {projects.length ? (
            <ul className="space-y-2">{projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-line bg-bg/40 p-2">
                <ProgressRing value={p.progress} size={44} stroke={4} label={p.title} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-ink">{p.code} — {p.title}</p><p className="text-xs text-muted">{p.stage.toLowerCase()} · {projectNeedsAttention(p, today).join(", ") || "no flags"}</p></div>
                <HealthDot health={p.health} label={false} />
              </li>
            ))}</ul>
          ) : <EmptyState>No projects visible.</EmptyState>}
        </HolographicPanel>
        <HolographicPanel title="Weekly report draft">
          {can(user.role, "reports:generate") ? <ReportDraft autoload={draft === "weekly"} /> : <EmptyState>Your role can view reports but not generate drafts.</EmptyState>}
        </HolographicPanel>
      </div>
    </>
  );
}
