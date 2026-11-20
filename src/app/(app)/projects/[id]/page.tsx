import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Milestone as MilestoneIcon, ShieldAlert, FileText, History, Target, ListChecks, LineChart } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getProject, listProjects } from "@/lib/data/repo";
import { audit } from "@/lib/audit";
import { klDateString, formatKlDate, relativeDue } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { TaskBoard } from "@/components/dashboard/TaskBoard";
import { Badge, ClassificationBadge, DemoBadge, EmptyState, HealthDot } from "@/components/ui";
import { PROJECT_STAGES } from "@/types";

export const metadata: Metadata = { title: "Project" };

const MS_TONE = { DONE: "teal", IN_PROGRESS: "cyan", PLANNED: "muted", AT_RISK: "danger" } as const;
const SEV_TONE = { LOW: "muted", MEDIUM: "amber", HIGH: "danger" } as const;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("projects:read");
  const { id } = await params;
  const data = await getProject(user, id);
  if (!data) {
    await audit({ actor: user, action: "PROJECT_READ", outcome: "DENIED", target: id, detail: "not found or not cleared" });
    notFound();
  }
  const { project: p, documents, tasks, objectives } = data;
  const today = klDateString();
  const { projects } = await listProjects(user);
  const stageIdx = PROJECT_STAGES.indexOf(p.stage);
  const taskTitle = (tid: string) => tasks.find((t) => t.id === tid)?.title ?? "(hidden task)";

  return (
    <div className="space-y-4">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-cyan"><ArrowLeft size={15} /> Projects</Link>
      <HolographicPanel bodyClassName="flex flex-wrap items-center gap-5">
        <ProgressRing value={p.progress} size={96} stroke={8} label="Project progress" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular text-sm text-cyan">{p.code}</span>
            <ClassificationBadge value={p.classification} />
            <HealthDot health={p.health} />
            {p.isDemo && <DemoBadge />}
          </div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{p.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{p.description}</p>
          <p className="mt-1 text-xs text-muted">Category: {p.category}</p>
        </div>
      </HolographicPanel>

      <HolographicPanel title="Project stage">
        <ol className="flex flex-wrap gap-1.5" aria-label="Project stage progression">
          {PROJECT_STAGES.filter((s) => s !== "ON_HOLD").map((s, i) => (
            <li key={s} aria-current={s === p.stage ? "step" : undefined} className={`rounded-md border px-2 py-1 text-xs ${s === p.stage ? "border-cyan bg-cyan/15 text-cyan" : i < stageIdx ? "border-teal/40 text-teal" : "border-line text-muted"}`}>{s.toLowerCase()}</li>
          ))}
        </ol>
      </HolographicPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <HolographicPanel title="Milestones & due dates" icon={<MilestoneIcon size={13} />} className="lg:col-span-2">
          <ul className="space-y-2">
            {[...p.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2">
                <div className="min-w-0"><p className="text-sm text-ink">{m.title}</p><p className="text-xs text-muted">Owner: {m.owner}</p></div>
                <div className="flex items-center gap-2"><span className="tabular text-xs text-muted">{formatKlDate(m.dueDate)}</span><Badge tone={MS_TONE[m.status]}>{m.status.replace("_", " ")}</Badge>{m.status !== "DONE" && <span className="text-xs text-muted">{relativeDue(m.dueDate, today)}</span>}</div>
              </li>
            ))}
          </ul>
        </HolographicPanel>
        <HolographicPanel title="Assigned personnel" icon={<Users size={13} />}>
          <ul className="space-y-1 text-sm">{p.personnel.map((n) => <li key={n} className="text-ink">{n}</li>)}</ul>
          <p className="mt-3 text-xs text-muted">Placeholder names — replace with actual team members.</p>
        </HolographicPanel>
        <HolographicPanel title="Progress chart" icon={<LineChart size={13} />} className="lg:col-span-2">
          <ProgressChart data={p.progressHistory} />
        </HolographicPanel>
        <HolographicPanel title="Risks" icon={<ShieldAlert size={13} />}>
          {p.risks.length ? (
            <ul className="space-y-2">{p.risks.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-bg/40 p-2 text-sm"><Badge tone={SEV_TONE[r.severity]}>{r.severity}</Badge><p className="mt-1 text-ink">{r.description}</p><p className="text-xs text-muted">Mitigation: {r.mitigation}</p></li>
            ))}</ul>
          ) : <EmptyState>No risks recorded.</EmptyState>}
        </HolographicPanel>
        <HolographicPanel title="Tasks & dependencies" icon={<ListChecks size={13} />} className="lg:col-span-2">
          <TaskBoard initialTasks={tasks} projects={projects.map((x) => ({ id: x.id, code: x.code }))} canWrite={can(user.role, "tasks:write")} currentUserId={user.id} today={today} showCreate={false} />
          {tasks.some((t) => t.dependsOn.length) && (
            <ul className="mt-3 space-y-1 text-xs text-muted">{tasks.filter((t) => t.dependsOn.length).map((t) => <li key={t.id}>{t.title} ← depends on {t.dependsOn.map(taskTitle).join(", ")}</li>)}</ul>
          )}
        </HolographicPanel>
        <HolographicPanel title="Research documents" icon={<FileText size={13} />}>
          {documents.length ? (
            <ul className="space-y-2">{documents.map((d) => (
              <li key={d.id} className="text-sm"><p className="text-ink">{d.title}</p><div className="mt-0.5 flex gap-1.5"><ClassificationBadge value={d.classification} /><Badge tone="muted">v{d.versions[0]?.version}</Badge></div></li>
            ))}</ul>
          ) : <EmptyState>No documents you are cleared to see.</EmptyState>}
        </HolographicPanel>
        <HolographicPanel title="Strategic alignment" icon={<Target size={13} />}>
          <ul className="space-y-1 text-sm">{objectives.map((o) => <li key={o.id} className="text-ink">• {o.title}</li>)}</ul>
          <Link href="/mission" className="mt-2 inline-block text-xs text-cyan">Mission & goals →</Link>
        </HolographicPanel>
        <HolographicPanel title="Approval history" icon={<History size={13} />} className="lg:col-span-2">
          {p.approvalHistory.length ? (
            <ul className="space-y-1 text-sm">{p.approvalHistory.map((a) => <li key={a.id}>{formatKlDate(a.date)} — {a.action}: {a.decision} by {a.reviewerName}</li>)}</ul>
          ) : <EmptyState>No management approvals recorded. Approvals appear here only when entered by an authorised user.</EmptyState>}
        </HolographicPanel>
      </div>
    </div>
  );
}
