import type { StrategicObjective } from "@/types";
import { DemoBadge } from "@/components/ui";

export function MissionTracker({ objectives, compact = false }: { objectives: StrategicObjective[]; compact?: boolean }) {
  return (
    <ul className="space-y-3">
      {objectives.map((o) => (
        <li key={o.id}>
          <div className="flex items-center justify-between gap-2">
            <p className={`min-w-0 ${compact ? "truncate text-sm" : "text-sm font-medium"} text-ink`}>{o.title}</p>
            <span className="tabular text-xs text-cyan">{o.progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg/70" role="progressbar" aria-valuenow={o.progress} aria-valuemin={0} aria-valuemax={100} aria-label={o.title}>
            <div className="h-full rounded-full bg-gradient-to-r from-royal via-cyan to-teal" style={{ width: `${o.progress}%` }} />
          </div>
          {!compact && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>KPI: {o.kpi}</span><span>· Target: {o.target}</span><span>· Owner: {o.owner}</span>{o.isDemo && <DemoBadge />}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
