import type { CalendarEvent } from "@/types";
import { formatKlDate, formatKlTime } from "@/lib/time";
import { Badge, EmptyState } from "@/components/ui";

const KIND_TONE = { MEETING: "royal", LAB_TEST: "teal", DEADLINE: "danger", REVIEW: "violet" } as const;

/** Day-grouped vertical timeline of events. */
export function CalendarTimeline({ events, today, days = 7, emptyText = "No events scheduled." }: { events: CalendarEvent[]; today: string; days?: number; emptyText?: string }) {
  const upcoming = events.filter((e) => e.start.slice(0, 10) >= today).slice(0, 50);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of upcoming) {
    const d = e.start.slice(0, 10);
    if (byDay.size >= days && !byDay.has(d)) break;
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  if (!byDay.size) return <EmptyState>{emptyText}</EmptyState>;
  return (
    <ol className="space-y-4">
      {[...byDay.entries()].map(([day, list]) => (
        <li key={day}>
          <p className="hud-label mb-1.5">{day === today ? "Today" : formatKlDate(day, { weekday: "short", day: "numeric", month: "short" })}</p>
          <ul className="space-y-1.5 border-l border-cyan/30 pl-3">
            {list.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-cyan shadow-[0_0_6px_var(--color-cyan)]" aria-hidden />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular text-xs text-cyan">{formatKlTime(e.start)}–{formatKlTime(e.end)}</span>
                  <Badge tone={KIND_TONE[e.kind]}>{e.kind.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-ink">{e.title}</p>
                {e.location && <p className="text-xs text-muted">{e.location}</p>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
