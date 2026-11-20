import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { listEvents, upcomingDeadlines } from "@/lib/data/repo";
import { klDateString, addDays, formatKlDate } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { CalendarTimeline } from "@/components/dashboard/CalendarTimeline";
import { DeadlineList } from "@/components/dashboard/DeadlineList";
import { Badge, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const user = await requirePageUser("calendar:read");
  const today = klDateString();
  const [events, deadlines] = await Promise.all([listEvents(user), upcomingDeadlines(user, today)]);
  const week = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  return (
    <>
      <PageHeader title="Calendar" subtitle="Events stored in the command centre. Google Calendar sync is not connected yet." actions={<Badge tone="muted">Google Calendar: not connected</Badge>} />
      <HolographicPanel title="Next 14 days" className="mb-4" bodyClassName="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-1.5">
          {week.map((d) => {
            const dayEvents = events.filter((e) => e.start.slice(0, 10) === d);
            const dayDeadlines = deadlines.filter((x) => x.date === d);
            return (
              <div key={d} className={`min-h-24 rounded-lg border p-1.5 ${d === today ? "border-cyan/60 bg-cyan/5" : "border-line bg-bg/30"}`}>
                <p className="tabular text-[0.65rem] text-muted">{formatKlDate(d, { weekday: "short", day: "numeric", month: "short" })}</p>
                {dayEvents.map((e) => <p key={e.id} className="mt-1 truncate rounded bg-royal/20 px-1 text-[0.65rem] text-ink" title={e.title}>{e.title}</p>)}
                {dayDeadlines.map((x, i) => <p key={i} className="mt-1 truncate rounded bg-danger/15 px-1 text-[0.65rem] text-danger" title={x.title}>⚑ {x.title}</p>)}
              </div>
            );
          })}
        </div>
      </HolographicPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <HolographicPanel title="Agenda"><CalendarTimeline events={events} today={today} days={10} /></HolographicPanel>
        <HolographicPanel title="Deadlines & milestones"><DeadlineList items={deadlines} today={today} limit={15} /></HolographicPanel>
      </div>
    </>
  );
}
