import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { can, permissionsFor, ROLE_LABEL } from "@/lib/permissions";
import { integrationStatus } from "@/lib/integrations";
import { readAudit } from "@/lib/audit";
import { getStore } from "@/lib/data/store";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { MotionToggle } from "@/components/layout/MotionToggle";
import { Badge, PageHeader } from "@/components/ui";
import { formatKlDate, formatKlTime } from "@/lib/time";

function activeSessions(sessions: { expiresAt: string }[]) {
  const now = Date.now();
  return sessions.filter((s) => Date.parse(s.expiresAt) > now).length;
}

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser("dashboard:view");
  const isAdmin = can(user.role, "settings:manage");
  const [db, auditLog] = await Promise.all([getStore().read(), isAdmin ? readAudit(100) : Promise.resolve([])]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, display options, integrations and (for administrators) users and the audit log." />
      <div className="grid gap-4 lg:grid-cols-2">
        <HolographicPanel title="Your account" bodyClassName="space-y-2 text-sm">
          <p><span className="text-muted">Name:</span> {user.displayName}</p>
          <p><span className="text-muted">Username:</span> {user.username}</p>
          <p><span className="text-muted">Role:</span> {ROLE_LABEL[user.role]}</p>
          <div className="flex flex-wrap gap-1">{permissionsFor(user.role).map((p) => <Badge key={p} tone="muted">{p}</Badge>)}</div>
        </HolographicPanel>
        <HolographicPanel title="Display" bodyClassName="space-y-2 text-sm">
          <p className="text-muted">Low-motion mode stops all animations (recommended for Smart TVs and older devices). Your operating system&apos;s “reduce motion” setting is always respected.</p>
          <MotionToggle />
          <p className="text-xs text-muted">Tip: open <code>/tv?motion=low</code> on a TV browser to set it there.</p>
        </HolographicPanel>
        <HolographicPanel title="Integrations" className="lg:col-span-2">
          <ul className="grid gap-2 md:grid-cols-2">
            {integrationStatus().map((i) => (
              <li key={i.key} className="rounded-lg border border-line bg-bg/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="text-ink">{i.name}</span><Badge tone={i.status === "ACTIVE" ? "teal" : "muted"}>{i.status.replaceAll("_", " ").toLowerCase()}</Badge></div>
                <p className="text-xs text-muted">{i.purpose}. {i.note}</p>
              </li>
            ))}
          </ul>
        </HolographicPanel>
        {isAdmin && (
          <>
            <HolographicPanel title="Users" bodyClassName="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="font-normal">Username</th><th className="font-normal">Name</th><th className="font-normal">Role</th><th className="font-normal">Status</th></tr></thead>
                <tbody>{db.users.map((u) => (
                  <tr key={u.id} className="border-t border-line"><td className="py-1.5">{u.username}</td><td>{u.displayName}</td><td>{ROLE_LABEL[u.role]}</td><td>{u.active ? "active" : "disabled"}{u.isDemo && " · demo"}</td></tr>
                ))}</tbody>
              </table>
              <p className="mt-2 text-xs text-muted">User management UI is pending. Demo accounts must be replaced before production — see SECURITY.md.</p>
            </HolographicPanel>
            <HolographicPanel title="Data store" bodyClassName="space-y-1 text-sm">
              <p><span className="text-muted">Backend:</span> local JSON file (DATA_DIR)</p>
              <p><span className="text-muted">Active sessions:</span> {activeSessions(db.sessions)}</p>
              <p><span className="text-muted">Records:</span> {db.projects.length} projects · {db.tasks.length} tasks · {db.documents.length} documents · {db.content.length} content items</p>
            </HolographicPanel>
            <HolographicPanel title="Audit log (latest 100)" className="lg:col-span-2" bodyClassName="max-h-96 overflow-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="sticky top-0 bg-panel"><tr className="text-left text-muted"><th className="py-1 font-normal">Time (MYT)</th><th className="font-normal">Actor</th><th className="font-normal">Action</th><th className="font-normal">Outcome</th><th className="font-normal">Detail</th></tr></thead>
                <tbody>{auditLog.map((a) => (
                  <tr key={a.id} className="border-t border-line"><td className="tabular py-1">{formatKlDate(a.at, { day: "2-digit", month: "short" })} {formatKlTime(a.at)}</td><td>{a.actorName ?? "—"}</td><td>{a.action}</td><td className={a.outcome === "SUCCESS" ? "text-teal" : a.outcome === "DENIED" ? "text-danger" : "text-amber"}>{a.outcome}</td><td className="max-w-xs truncate text-muted">{a.target ?? ""} {a.detail ?? ""}</td></tr>
                ))}</tbody>
              </table>
            </HolographicPanel>
          </>
        )}
      </div>
    </>
  );
}
