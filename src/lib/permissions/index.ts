import type { Classification, Role } from "@/types";

/**
 * Role-based access control. DEFAULT DENY: a role has a permission only if it
 * is listed here. Every API route and server page calls `can()` / `requirePermission()`.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "tasks:read",
  "tasks:write",
  "projects:read",
  "projects:write",
  "research:read",
  "research:write",
  "grants:read",
  "grants:write",
  "mission:read",
  "mission:write",
  "calendar:read",
  "content:read",
  "content:edit",
  "content:fact_check",
  "content:pnc_review",
  "content:approve",
  "content:publish",
  "reports:read",
  "reports:generate",
  "assistant:use",
  "notes:write",
  "audit:read",
  "settings:manage",
  "tv:view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL_STAFF: Permission[] = [
  "dashboard:view",
  "tasks:read",
  "projects:read",
  "research:read",
  "grants:read",
  "mission:read",
  "calendar:read",
  "content:read",
  "assistant:use",
  "tv:view",
];

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([...PERMISSIONS]),
  "R&D_MANAGER": new Set<Permission>([
    ...ALL_STAFF,
    "tasks:write",
    "projects:write",
    "research:write",
    "grants:write",
    "mission:write",
    "content:edit",
    "content:fact_check",
    "content:pnc_review",
    "content:approve",
    "content:publish",
    "reports:read",
    "reports:generate",
    "notes:write",
  ]),
  "R&D_ENGINEER": new Set<Permission>([
    ...ALL_STAFF,
    "tasks:write",
    "research:write",
    "content:edit",
    "content:fact_check",
    "reports:generate",
    "notes:write",
  ]),
  MANAGEMENT_VIEWER: new Set<Permission>([...ALL_STAFF, "reports:read"]),
  TV_VIEWER: new Set<Permission>(["tv:view"]),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const set = MATRIX[role];
  return set ? set.has(permission) : false;
}

export function permissionsFor(role: Role): Permission[] {
  return [...(MATRIX[role] ?? [])];
}

/**
 * Document classification clearance. PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED.
 * TV_VIEWER is limited to PUBLIC; management viewers to INTERNAL;
 * engineers to CONFIDENTIAL; ADMIN and R&D_MANAGER to RESTRICTED.
 */
const LEVEL: Record<Classification, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
const CLEARANCE: Record<Role, number> = {
  ADMIN: 3,
  "R&D_MANAGER": 3,
  "R&D_ENGINEER": 2,
  MANAGEMENT_VIEWER: 1,
  TV_VIEWER: 0,
};

export function canAccessClassification(role: Role | null | undefined, classification: Classification): boolean {
  if (!role) return false;
  const clearance = CLEARANCE[role];
  if (clearance === undefined) return false;
  const level = LEVEL[classification];
  if (level === undefined) return false; // unknown classification → deny
  return level <= clearance;
}

export function filterByClearance<T extends { classification: Classification }>(role: Role, items: T[]): { visible: T[]; hiddenCount: number } {
  const visible = items.filter((i) => canAccessClassification(role, i.classification));
  return { visible, hiddenCount: items.length - visible.length };
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  "R&D_MANAGER": "R&D Manager",
  "R&D_ENGINEER": "R&D Engineer",
  MANAGEMENT_VIEWER: "Management Viewer",
  TV_VIEWER: "TV Display",
};
