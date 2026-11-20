import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { formatKlDate, relativeDue } from "@/lib/time";

type Deadline = { kind: string; title: string; date: string; ref: string; days: number };

export function DeadlineList({ items, today, limit = 6 }: { items: Deadline[]; today: string; limit?: number }) {
  const list = items.filter((d) => d.days >= -30).slice(0, limit);
  if (!list.length) return <EmptyState>No upcoming deadlines.</EmptyState>;
  return (
    <ul className="space-y-1.5">
      {list.map((d, i) => (
        <li key={i}>
          <Link href={d.ref} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-panel/60">
            <span className="min-w-0">
              <span className="block truncate text-sm text-ink">{d.title}</span>
              <span className="text-xs text-muted">{formatKlDate(d.date)} · {d.kind.toLowerCase()}</span>
            </span>
            <Badge tone={d.days < 0 ? "danger" : d.days <= 3 ? "amber" : "muted"}>{relativeDue(d.date, today)}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
