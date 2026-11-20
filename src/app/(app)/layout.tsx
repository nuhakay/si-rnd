import { requirePageUser } from "@/lib/auth/session";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { NAV_ITEMS } from "@/components/navigation/nav-items";
import { Sidebar, MobileNav } from "@/components/navigation/Navigation";
import { LiveClock } from "@/components/layout/LiveClock";
import { MotionToggle } from "@/components/layout/MotionToggle";
import { Badge } from "@/components/ui";
import { getStore } from "@/lib/data/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("dashboard:view");
  const items = NAV_ITEMS.filter((i) => i.anyOf.some((p) => can(user.role, p)));
  const db = await getStore().read();
  const hasDemo = db.projects.some((p) => p.isDemo);
  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} user={{ displayName: user.displayName, roleLabel: ROLE_LABEL[user.role] }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 py-2 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="whitespace-nowrap font-display text-xs font-bold tracking-[0.22em] text-cyan lg:hidden">SI ACOUSTIC</span>
            {hasDemo && <Badge tone="violet" title="Sample records — replace with verified company data">Demo data</Badge>}
            <span className="hidden sm:block"><Badge tone="muted">{ROLE_LABEL[user.role]}</Badge></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block"><MotionToggle /></span>
            <LiveClock size="sm" />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-28 pt-5 md:px-6 lg:pb-8">{children}</main>
      </div>
      <MobileNav items={items} />
    </div>
  );
}
