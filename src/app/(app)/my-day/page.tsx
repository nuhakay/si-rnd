import type { Metadata } from "next";
import { CalendarDays, Flag, AlertTriangle, Trophy, StickyNote, FlaskConical, Users } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listTasks, listProjects, listEvents, listNotes, upcomingDeadlines } from "@/lib/data/repo";
import { klDateString, daysUntil } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { TaskBoard } from "@/components/dashboard/TaskBoard";
import { CalendarTimeline } from "@/components/dashboard/CalendarTimeline";
import { DeadlineList } from "@/components/dashboard/DeadlineList";
import { QuickNotes } from "@/components/dashboard/QuickNotes";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "My Day" };

export default async function MyDayPage() {
  const user = await requirePageUser("tasks:read");
  const today = klDateString();
  const [tasks, { projects }, events, notes, deadlines] = await Promise.all([listTasks(user), listProjects(user), listEvents(user), can(user.role, "notes:write") ? listNotes(user) : Promise.resolve([]), upcomingDeadlines(user, today)]);
  const open = tasks.filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const todays = events.filter((e) => e.start.slice(0, 10) === today);
  const meetings = events.filter((e) => e.kind === "MEETING" || e.kind === "REVIEW");
  const achievements = tasks.filter((t) => t.status === "DONE" && t.completedAt && daysUntil(klDateString(new Date(t.completedAt)), today) === 0);
  const research = deadlines.filter((d) => d.kind !== "TASK" && d.days >= 0 && d.days <= 30);
  const projOpts = projects.map((p) => ({ id: p.id, code: p.code }));
  const canWrite = can(user.role, "tasks:write");

  return (
    <>
      <PageHeader title="My Day — Daily Command Centre" subtitle="Today's schedule, priorities, overdue work and research deadlines." />
      <div className="grid gap-4 lg:grid-cols-3">
        <HolographicPanel title="Three highest priorities" icon={<Flag size={13} />} className="lg:col-span-2">
          <TaskBoard initialTasks={open} projects={projOpts} canWrite={canWrite} currentUserId={user.id} today={today} limit={3} showCreate={canWrite} />
        </HolographicPanel>
        <HolographicPanel title="Today's schedule" icon={<CalendarDays size={13} />}>
          <CalendarTimeline events={todays} today={today} days={1} emptyText="Nothing scheduled today." />
        </HolographicPanel>
        <HolographicPanel title={`Overdue (${overdue.length})`} icon={<AlertTriangle size={13} />}>
          {overdue.length ? <TaskBoard key={`o-${overdue.length}`} initialTasks={overdue} projects={projOpts} canWrite={canWrite} currentUserId={user.id} today={today} showCreate={false} /> : <EmptyState>Nothing overdue.</EmptyState>}
        </HolographicPanel>
        <HolographicPanel title="Upcoming meetings" icon={<Users size={13} />}>
          <CalendarTimeline events={meetings} today={today} days={3} />
        </HolographicPanel>
        <HolographicPanel title="Research deadlines (30 days)" icon={<FlaskConical size={13} />}>
          <DeadlineList items={research} today={today} />
        </HolographicPanel>
        <HolographicPanel title="Today's achievements" icon={<Trophy size={13} />}>
          {achievements.length ? (
            <ul className="space-y-1 text-sm">{achievements.map((t) => <li key={t.id} className="text-teal">✓ <span className="text-ink">{t.title}</span></li>)}</ul>
          ) : <EmptyState>Complete a task to see it here.</EmptyState>}
        </HolographicPanel>
        {can(user.role, "notes:write") && (
          <HolographicPanel title="Quick notes" icon={<StickyNote size={13} />} className="lg:col-span-2">
            <QuickNotes initial={notes} />
          </HolographicPanel>
        )}
      </div>
    </>
  );
}
