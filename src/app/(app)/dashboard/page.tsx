import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlarmClock, FileText, FolderKanban, Gauge, ListChecks, Bell, Flag, Clock } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listTasks, listProjects, upcomingDeadlines, getNotifications, projectNeedsAttention } from "@/lib/data/repo";
import { readAudit } from "@/lib/audit";
import { integrationStatus } from "@/lib/integrations";
import { klDateString, daysUntil, formatKlDate, formatKlTime } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { VoiceCommandPanel } from "@/components/ai/VoiceCommandPanel";
import { LiveClock } from "@/components/layout/LiveClock";
import { ProjectStatusCard } from "@/components/dashboard/ProjectStatusCard";
import { DeadlineList } from "@/components/dashboard/DeadlineList";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { KPIWidget } from "@/components/dashboard/KPIWidget";
import { ProjectTimeline } from "@/components/charts/ProjectTimeline";
import { Badge, EmptyState, HealthDot } from "@/components/ui";

export const metadata: Metadata = { title: "Command Centre" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePageUser("dashboard:view");
  const { denied } = await searchParams;
  const today = klDateString();
  const [tasks, { projects }, deadlines, notifications, audit] = await Promise.all([
    listTasks(user), listProjects(user), upcomingDeadlines(user, today), getNotifications(user), readAudit(300),
  ]);
  const open = tasks.filter((t) => t.status !== "DONE");
  const top3 = open.slice(0, 3);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const doneWeek = tasks.filter((t) => t.status === "DONE" && t.completedAt && daysUntil(klDateString(new Date(t.completedAt)), today) >= -7);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const milestones = projects.flatMap((p) => p.milestones.map((m) => ({ ...m, code: p.code, pid: p.id })));
  const msDone = milestones.filter((m) => m.status === "DONE").length;
  const attention = projects.map((p) => ({ p, reasons: projectNeedsAttention(p, today) }));
  const lastDraft = audit.find((a) => a.action === "REPORT_WEEKLY_DRAFT" && a.actorId === user.id);
  const integrations = integrationStatus();
  const activity = user.role === "ADMIN" ? audit.slice(0, 6) : audit.filter((a) => a.actorId === user.id).slice(0, 6);

  return (
    <div className="space-y-4">
      {denied && <p role="alert" className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">You don&apos;t have access to that page. It has been logged.</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        {/* CENTRE */}
        <HolographicPanel className="xl:min-h-[640px]" bodyClassName="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="hud-label">AURA · Acoustic Unified Research Assistant</p>
              <h1 className="font-display text-2xl font-semibold md:text-3xl">Welcome, {user.displayName}</h1>
            </div>
            <LiveClock />
          </div>
          <VoiceCommandPanel variant="orb" orbSize="min(340px, 78vw)" />
          <div>
            <p className="hud-label mb-2 flex items-center gap-2"><Flag size={13} /> Current main priorities</p>
            {top3.length ? (
              <ol className="grid gap-2 md:grid-cols-3">
                {top3.map((t, i) => (
                  <li key={t.id} className="rounded-lg border border-line bg-bg/40 p-3">
                    <span className="tabular text-xs text-cyan">0{i + 1}</span>
                    <p className="text-sm text-ink">{t.title}</p>
                    <p className="mt-1 text-xs text-muted">{t.priority.toLowerCase()}{t.dueDate && ` · due ${formatKlDate(t.dueDate, { day: "numeric", month: "short" })}`}</p>
                  </li>
                ))}
              </ol>
            ) : <EmptyState>No open priorities.</EmptyState>}
          </div>
        </HolographicPanel>

        {/* RIGHT */}
        <div className="grid content-start gap-4">
          <HolographicPanel title="Upcoming deadlines" icon={<AlarmClock size={13} />} action={<Link href="/calendar" className="text-xs text-cyan">Calendar</Link>}>
            <DeadlineList items={deadlines} today={today} limit={5} />
          </HolographicPanel>
          <HolographicPanel title="Active R&D projects" icon={<FolderKanban size={13} />} action={<Link href="/projects" className="text-xs text-cyan">All</Link>} bodyClassName="space-y-2">
            {projects.length ? attention.map(({ p, reasons }) => <ProjectStatusCard key={p.id} project={p} today={today} compact attention={reasons} />) : <EmptyState>No projects visible to your role.</EmptyState>}
          </HolographicPanel>
          <HolographicPanel title="Notifications" icon={<Bell size={13} />}>
            <NotificationPanel notifications={notifications.slice(0, 4)} />
          </HolographicPanel>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPIWidget label="Avg project progress" value={`${avgProgress}%`} ring={avgProgress} hint={`${projects.length} visible projects`} />
        <KPIWidget label="Milestones complete" value={`${msDone}/${milestones.length}`} ring={milestones.length ? (msDone / milestones.length) * 100 : 0} tone="var(--color-teal)" hint="Across visible projects" />
        <KPIWidget label="Open tasks" value={open.length} icon={<ListChecks size={20} />} hint={`${overdue.length} overdue`} tone={overdue.length ? "var(--color-amber)" : "var(--color-cyan)"} />
        <KPIWidget label="Done this week" value={doneWeek.length} icon={<Gauge size={20} />} tone="var(--color-teal)" hint="Tasks completed (7 days)" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <HolographicPanel title="Project milestone timeline" icon={<Clock size={13} />}>
          {projects.length ? <ProjectTimeline projects={projects} today={today} /> : <EmptyState>No projects.</EmptyState>}
        </HolographicPanel>
        <HolographicPanel title="Weekly reporting" icon={<FileText size={13} />} bodyClassName="space-y-2 text-sm">
          <p className="text-ink">Week ending {formatKlDate(today)}</p>
          <p className="text-muted">Last draft by you: {lastDraft ? `${formatKlDate(lastDraft.at)} ${formatKlTime(lastDraft.at)}` : "none yet"}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="teal">{doneWeek.length} done</Badge>
            <Badge tone={overdue.length ? "danger" : "muted"}>{overdue.length} overdue</Badge>
            <Badge tone="amber">{attention.filter((a) => a.reasons.length).length} need attention</Badge>
          </div>
          {(can(user.role, "reports:generate") || can(user.role, "reports:read")) && <Link href="/reports?draft=weekly" className="inline-block text-cyan">Open report draft →</Link>}
        </HolographicPanel>
        <HolographicPanel title="System activity" icon={<Activity size={13} />} bodyClassName="space-y-2 text-xs">
          <ul className="space-y-1">
            {integrations.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted">{i.name}</span>
                <Badge tone={i.status === "ACTIVE" ? "teal" : "muted"}>{i.status === "ACTIVE" ? "active" : "not connected"}</Badge>
              </li>
            ))}
          </ul>
          <p className="hud-label pt-1">{user.role === "ADMIN" ? "Recent audit events" : "Your recent activity"}</p>
          <ul className="space-y-1">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-2"><span className="truncate text-ink">{a.action.toLowerCase().replaceAll("_", " ")}{user.role === "ADMIN" && a.actorName ? ` · ${a.actorName}` : ""}</span><span className="tabular shrink-0 text-muted">{formatKlTime(a.at)}</span></li>
            ))}
            {!activity.length && <li className="text-muted">No activity yet.</li>}
          </ul>
        </HolographicPanel>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><HealthDot health="GREEN" /></span>
        <span className="inline-flex items-center gap-1.5"><HealthDot health="AMBER" /></span>
        <span className="inline-flex items-center gap-1.5"><HealthDot health="RED" /></span>
        <span>· Figures marked DEMO are placeholders until verified data is entered.</span>
      </div>
    </div>
  );
}
