import Link from "next/link";
import type { Project } from "@/types";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { ClassificationBadge, DemoBadge, HealthDot } from "@/components/ui";
import { formatKlDate, relativeDue } from "@/lib/time";

const HEALTH_COLOR = { GREEN: "var(--color-teal)", AMBER: "var(--color-amber)", RED: "var(--color-danger)" } as const;

export function ProjectStatusCard({ project, today, compact = false, attention = [] }: { project: Project; today: string; compact?: boolean; attention?: string[] }) {
  const next = project.milestones.filter((m) => m.status !== "DONE").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return (
    <Link href={`/projects/${project.id}`} className="holo-panel group flex items-center gap-3 p-3 transition-colors hover:border-cyan/50">
      <ProgressRing value={project.progress} size={compact ? 46 : 60} stroke={compact ? 4 : 5} color={HEALTH_COLOR[project.health]} label={project.title} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tabular text-xs text-cyan">{project.code}</span>
          <HealthDot health={project.health} label={!compact} />
          {!compact && <ClassificationBadge value={project.classification} />}
          {!compact && project.isDemo && <DemoBadge />}
        </div>
        <p className="truncate font-medium text-ink group-hover:text-cyan">{project.title}</p>
        <p className="truncate text-xs text-muted">
          {project.stage.toLowerCase()} {next && <>· next: {next.title} ({formatKlDate(next.dueDate, { day: "numeric", month: "short" })}, {relativeDue(next.dueDate, today).toLowerCase()})</>}
        </p>
        {attention.length > 0 && <p className="truncate text-xs text-amber">⚠ {attention.join(" · ")}</p>}
      </div>
    </Link>
  );
}
