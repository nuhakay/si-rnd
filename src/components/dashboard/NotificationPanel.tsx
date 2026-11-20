import { AlertTriangle, CheckCircle2, Info, XOctagon } from "lucide-react";
import type { Notification } from "@/types";

const ICON = { INFO: Info, WARNING: AlertTriangle, ERROR: XOctagon, SUCCESS: CheckCircle2 };
const COLOR = { INFO: "text-cyan", WARNING: "text-amber", ERROR: "text-danger", SUCCESS: "text-teal" };

export function NotificationPanel({ notifications, large = false, horizontal = false }: { notifications: Pick<Notification, "level" | "message">[]; large?: boolean; horizontal?: boolean }) {
  if (!notifications.length) return <p className="text-sm text-muted">No notifications.</p>;
  return (
    <ul className={horizontal ? "grid grid-cols-3 gap-2" : "space-y-2"}>
      {notifications.map((n, i) => {
        const Icon = ICON[n.level];
        return (
          <li key={i} className={`flex items-start gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2 ${large ? "text-[clamp(1rem,1.3vw,1.6rem)]" : "text-sm"}`}>
            <Icon size={large ? 26 : 16} className={`mt-0.5 shrink-0 ${COLOR[n.level]}`} aria-label={n.level} />
            <span className={large ? "line-clamp-2 text-ink" : "text-ink"}>{n.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
