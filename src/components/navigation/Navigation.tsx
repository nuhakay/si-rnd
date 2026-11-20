"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Sun, FolderKanban, ListChecks, CalendarDays, BookOpen, Landmark, Target, Clapperboard, Bot, FileBarChart, Settings, Tv, LogOut, Menu, X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/components/ui";
import type { NavItem } from "./nav-items";

const ICONS: Record<string, LucideIcon> = { LayoutDashboard, Sun, FolderKanban, ListChecks, CalendarDays, BookOpen, Landmark, Target, Clapperboard, Bot, FileBarChart, Settings, Tv };

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(`${href}/`);
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={cx("inline-flex items-center gap-2 text-sm text-muted hover:text-danger", className)}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}

export function Sidebar({ items, user }: { items: NavItem[]; user: { displayName: string; roleLabel: string } }) {
  const isActive = useActive();
  return (
    <nav aria-label="Department navigation" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-bg-2/70 backdrop-blur lg:flex">
      <div className="border-b border-line px-5 py-4">
        <p className="font-display text-sm font-bold tracking-[0.22em] text-cyan glow-text">SI ACOUSTIC</p>
        <p className="hud-label mt-0.5">R&amp;D Command Centre</p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                  active ? "border-cyan/40 bg-cyan/10 text-cyan shadow-[inset_3px_0_0_var(--color-cyan)]" : "border-transparent text-muted hover:bg-panel/60 hover:text-ink",
                )}
              >
                <Icon size={17} className={active ? "text-cyan" : "text-muted group-hover:text-cyan"} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 border-t border-line px-4 py-3">
        <div>
          <p className="truncate text-sm text-ink">{user.displayName}</p>
          <p className="text-xs text-muted">{user.roleLabel}</p>
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  const [open, setOpen] = useState(false);
  const primary = items.filter((i) => i.mobile).slice(0, 4);
  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-2/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-5">
          {primary.map((it) => {
            const Icon = ICONS[it.icon];
            const active = isActive(it.href);
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={cx("flex flex-col items-center gap-0.5 py-2 text-[0.65rem]", active ? "text-cyan" : "text-muted")}>
                  <Icon size={20} />
                  <span className="truncate">{it.label === "Command Centre" ? "Home" : it.label === "AI Assistant" ? "AURA" : it.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" className={cx("flex w-full flex-col items-center gap-0.5 py-2 text-[0.65rem]", open ? "text-cyan" : "text-muted")}>
              {open ? <X size={20} /> : <Menu size={20} />}
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-40 max-h-[70dvh] overflow-y-auto border-t border-line bg-bg-2 p-3 lg:hidden">
          <ul className="grid grid-cols-2 gap-2">
            {items.map((it) => {
              const Icon = ICONS[it.icon];
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={() => setOpen(false)} className={cx("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm", isActive(it.href) ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-line text-ink")}>
                    <Icon size={16} /> {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <LogoutButton className="mt-3 px-1" />
        </div>
      )}
    </>
  );
}
