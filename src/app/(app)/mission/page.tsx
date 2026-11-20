import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { getStrategy } from "@/lib/data/repo";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { MissionTracker } from "@/components/dashboard/MissionTracker";
import { Badge, PageHeader } from "@/components/ui";
import { Compass, Eye, Map, Target, Link2 } from "lucide-react";

export const metadata: Metadata = { title: "Mission & Vision" };

export default async function MissionPage() {
  const user = await requirePageUser("mission:read");
  const data = (await getStrategy(user))!;
  const { strategy, objectives, projects } = data;
  const annual = objectives.filter((o) => o.horizon === "ANNUAL");
  const longTerm = objectives.filter((o) => o.horizon === "FIVE_YEAR");
  return (
    <>
      <PageHeader title="Mission, Vision & Strategic Goals" subtitle={`Company tagline: “${strategy.tagline}”.`} actions={<Badge tone={strategy.status === "APPROVED" ? "teal" : "amber"}>{strategy.status === "APPROVED" ? "Approved" : "Draft — awaiting R&D Manager confirmation"}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <HolographicPanel title="Department mission" icon={<Compass size={13} />}><p className="text-lg leading-relaxed text-ink">{strategy.mission}</p></HolographicPanel>
        <HolographicPanel title="Department vision" icon={<Eye size={13} />}><p className="text-lg leading-relaxed text-ink">{strategy.vision}</p></HolographicPanel>
        <HolographicPanel title="Annual goals & KPIs" icon={<Target size={13} />}><MissionTracker objectives={annual} /></HolographicPanel>
        <HolographicPanel title="Long-term objectives" icon={<Target size={13} />}><MissionTracker objectives={longTerm} /></HolographicPanel>
        <HolographicPanel title="Five-year innovation roadmap" icon={<Map size={13} />} className="lg:col-span-2">
          <ol className="grid gap-3 md:grid-cols-5">
            {strategy.roadmap.map((r, i) => (
              <li key={r.year} className="relative rounded-lg border border-line bg-bg/40 p-3">
                <span className="tabular text-xs text-cyan">{r.year}</span>
                <p className="font-display text-ink">{r.theme}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">{r.outcomes.map((o) => <li key={o}>• {o}</li>)}</ul>
                {i === 0 && <Badge tone="teal" className="absolute right-2 top-2">Now</Badge>}
              </li>
            ))}
          </ol>
        </HolographicPanel>
        <HolographicPanel title="Strategic project alignment" icon={<Link2 size={13} />} className="lg:col-span-2" bodyClassName="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1 pr-2 font-normal">Objective</th>{projects.map((p) => <th key={p.id} className="px-2 py-1 text-center font-normal"><Link href={`/projects/${p.id}`} className="tabular text-cyan">{p.code}</Link></th>)}</tr></thead>
            <tbody>
              {objectives.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="py-1.5 pr-2 text-ink">{o.title}</td>
                  {projects.map((p) => <td key={p.id} className="px-2 text-center">{p.objectiveIds.includes(o.id) ? <span className="text-teal" aria-label="aligned">●</span> : <span className="text-white/10" aria-label="not aligned">·</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </HolographicPanel>
      </div>
    </>
  );
}
