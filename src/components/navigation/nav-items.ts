import type { Permission } from "@/lib/permissions";

export interface NavItem { href: string; label: string; icon: string; anyOf: Permission[]; mobile?: boolean }

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Command Centre", icon: "LayoutDashboard", anyOf: ["dashboard:view"], mobile: true },
  { href: "/my-day", label: "My Day", icon: "Sun", anyOf: ["tasks:read"] },
  { href: "/projects", label: "Projects", icon: "FolderKanban", anyOf: ["projects:read"], mobile: true },
  { href: "/tasks", label: "Tasks", icon: "ListChecks", anyOf: ["tasks:read"], mobile: true },
  { href: "/calendar", label: "Calendar", icon: "CalendarDays", anyOf: ["calendar:read"] },
  { href: "/research", label: "Research", icon: "BookOpen", anyOf: ["research:read"] },
  { href: "/grants", label: "Funding", icon: "Landmark", anyOf: ["grants:read"] },
  { href: "/mission", label: "Mission & Vision", icon: "Target", anyOf: ["mission:read"] },
  { href: "/content-factory", label: "Content Factory", icon: "Clapperboard", anyOf: ["content:read"] },
  { href: "/assistant", label: "AI Assistant", icon: "Bot", anyOf: ["assistant:use"], mobile: true },
  { href: "/reports", label: "Reports", icon: "FileBarChart", anyOf: ["reports:read", "reports:generate"] },
  { href: "/settings", label: "Settings", icon: "Settings", anyOf: ["dashboard:view"] },
  { href: "/tv", label: "TV Mode", icon: "Tv", anyOf: ["tv:view"] },
];
