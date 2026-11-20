import Link from "next/link";
import type { Project } from "@/types";
import { daysUntil, formatKlDate } from "@/lib/time";

/** Lightweight SVG-free milestone timeline: −14 … +45 days window. */
export function ProjectTimeline({ projects, today }: { projects: Project[]; today: string }) {
  const from = -14, to = 45, span = to - from;
  const pos = (d: number) => `${((Math.max(from, Math.min(to, d)) - from) / span) * 100}%`;
  const colour = { DONE: "bg-teal", IN_PROGRESS: "bg-cyan", PLANNED: "bg-royal", AT_RISK: "bg-danger" } as const;
  return (
    <div className="space-y-2">
      <div className="relative ml-14 h-4 text-[0.6rem] text-muted">
        {[-14, 0, 14, 30, 45].map((d) => (
          <span key={d} className="absolute -translate-x-1/2" style={{ left: pos(d) }}>{d === 0 ? "Today" : `${d > 0 ? "+" : ""}${d}d`}</span>
        ))}
      </div>
      {projects.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <Link href={`/projects/${p.id}`} className="tabular w-12 shrink-0 text-xs text-cyan hover:underline">{p.code}</Link>
          <div className="relative h-5 flex-1 rounded bg-bg/60">
            <span className="absolute inset-y-0 w-px bg-cyan/60" style={{ left: pos(0) }} aria-hidden />
            {p.milestones.map((m) => {
              const d = daysUntil(m.dueDate, today);
              if (d < from || d > to) return null;
              return (
                <span key={m.id} title={`${m.title} — ${formatKlDate(m.dueDate)} (${m.status})`} className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${colour[m.status]}`} style={{ left: pos(d) }}>
                  <span className="sr-only">{m.title} {formatKlDate(m.dueDate)} {m.status}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
      <div className="ml-14 flex flex-wrap gap-3 text-[0.65rem] text-muted">
        {Object.entries(colour).map(([k, c]) => (<span key={k} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rotate-45 ${c}`} />{k.replace("_", " ").toLowerCase()}</span>))}
      </div>
    </div>
  );
}
