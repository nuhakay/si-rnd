import { describe, it, expect } from "vitest";
import { can, canAccessClassification, filterByClearance, PERMISSIONS } from "@/lib/permissions";
import { ROLES, type Classification } from "@/types";

describe("RBAC (default deny)", () => {
  it("denies everything for missing or unknown roles", () => {
    expect(can(null, "dashboard:view")).toBe(false);
    expect(can(undefined, "tv:view")).toBe(false);
    expect(can("HACKER" as never, "tasks:read")).toBe(false);
  });
  it("gives ADMIN every permission", () => {
    for (const p of PERMISSIONS) expect(can("ADMIN", p)).toBe(true);
  });
  it("limits TV_VIEWER to tv:view only", () => {
    for (const p of PERMISSIONS) expect(can("TV_VIEWER", p)).toBe(p === "tv:view");
  });
  it("keeps MANAGEMENT_VIEWER read-only", () => {
    for (const p of PERMISSIONS.filter((x) => /:(write|edit|approve|publish|fact_check|pnc_review|generate|manage)$/.test(x) || x === "notes:write" || x === "audit:read")) {
      expect(can("MANAGEMENT_VIEWER", p), p).toBe(false);
    }
    expect(can("MANAGEMENT_VIEWER", "reports:read")).toBe(true);
  });
  it("lets engineers fact-check but not PNC-screen, approve or publish", () => {
    expect(can("R&D_ENGINEER", "content:fact_check")).toBe(true);
    expect(can("R&D_ENGINEER", "content:pnc_review")).toBe(false);
    expect(can("R&D_ENGINEER", "content:approve")).toBe(false);
    expect(can("R&D_ENGINEER", "content:publish")).toBe(false);
  });
  it("restricts audit log and settings to ADMIN", () => {
    for (const r of ROLES) {
      expect(can(r, "audit:read")).toBe(r === "ADMIN");
      expect(can(r, "settings:manage")).toBe(r === "ADMIN");
    }
  });
});

describe("PNC classification clearance", () => {
  const table: [string, Classification, boolean][] = [
    ["TV_VIEWER", "PUBLIC", true], ["TV_VIEWER", "INTERNAL", false],
    ["MANAGEMENT_VIEWER", "INTERNAL", true], ["MANAGEMENT_VIEWER", "CONFIDENTIAL", false],
    ["R&D_ENGINEER", "CONFIDENTIAL", true], ["R&D_ENGINEER", "RESTRICTED", false],
    ["R&D_MANAGER", "RESTRICTED", true], ["ADMIN", "RESTRICTED", true],
  ];
  it.each(table)("%s → %s = %s", (role, cls, expected) => {
    expect(canAccessClassification(role as never, cls)).toBe(expected);
  });
  it("denies unknown classifications", () => {
    expect(canAccessClassification("ADMIN", "TOP_SECRET" as never)).toBe(false);
  });
  it("filters and counts hidden items", () => {
    const items = (["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const).map((classification) => ({ classification }));
    expect(filterByClearance("R&D_ENGINEER", items)).toEqual({ visible: items.slice(0, 3), hiddenCount: 1 });
    expect(filterByClearance("TV_VIEWER", items).hiddenCount).toBe(3);
  });
});
