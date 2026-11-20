import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PublicUser } from "@/types";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "sia-test-"));

const repo = await import("@/lib/data/repo");
const { getStore } = await import("@/lib/data/store");

let users: Record<string, PublicUser>;

beforeAll(async () => {
  const db = await getStore().read();
  users = Object.fromEntries(db.users.map((u) => [u.username, { id: u.id, username: u.username, displayName: u.displayName, role: u.role }]));
});

describe("seed data", () => {
  it("flags every record as demo and contains no invented money figures", async () => {
    const db = await getStore().read();
    for (const coll of [db.projects, db.tasks, db.documents, db.grants, db.objectives, db.content, db.events]) {
      for (const r of coll) expect((r as { isDemo: boolean }).isDemo).toBe(true);
    }
    for (const g of db.grants) expect(g.requestedFunding).toBeNull();
    expect(db.users.every((u) => u.passwordHash.startsWith("scrypt$"))).toBe(true);
  });
});

describe("classification-aware queries", () => {
  it("hides RESTRICTED projects and documents from engineers", async () => {
    const { projects, hiddenCount } = await repo.listProjects(users.engineer);
    expect(projects.some((p) => p.classification === "RESTRICTED")).toBe(false);
    expect(hiddenCount).toBeGreaterThan(0);
    const docs = await repo.listDocuments(users.engineer);
    expect(docs.documents.some((d) => d.classification === "RESTRICTED")).toBe(false);
  });
  it("shows management viewers only PUBLIC/INTERNAL", async () => {
    const { projects } = await repo.listProjects(users.viewer);
    expect(projects.every((p) => ["PUBLIC", "INTERNAL"].includes(p.classification))).toBe(true);
    const { grants } = await repo.listGrants(users.viewer);
    expect(grants.every((g) => g.classification === "INTERNAL" || g.classification === "PUBLIC")).toBe(true);
  });
  it("returns null for a project above the user's clearance", async () => {
    const all = await repo.listProjects(users.admin);
    const restricted = all.projects.find((p) => p.classification === "RESTRICTED")!;
    expect(await repo.getProject(users.engineer, restricted.id)).toBeNull();
    expect(await repo.getProject(users.manager, restricted.id)).not.toBeNull();
  });
  it("strips linked documents the user may not see", async () => {
    const all = await repo.listProjects(users.admin);
    const chm = all.projects.find((p) => p.code === "CHM")!;
    const asEngineer = await repo.getProject(users.engineer, chm.id);
    expect(asEngineer!.documents.every((d) => d.classification !== "RESTRICTED")).toBe(true);
    expect(chm.documentIds.length).toBeGreaterThan(asEngineer!.project.documentIds.length);
  });
  it("gives TV viewer nothing through normal queries", async () => {
    expect((await repo.listProjects(users.tv)).projects).toEqual([]);
    expect(await repo.listTasks(users.tv)).toEqual([]);
    expect((await repo.listDocuments(users.tv)).documents).toEqual([]);
  });
});

describe("TV snapshot sanitisation", () => {
  it("exposes only whitelisted, non-personal fields", async () => {
    const snap = await repo.getTvSnapshot();
    const json = JSON.stringify(snap);
    expect(json).not.toMatch(/personnel|description|risks|passwordHash|ownerId|Demo Engineer|formulation/i);
    for (const p of snap.projects) expect(Object.keys(p).sort()).toEqual(["code", "health", "progress", "stage", "title"]);
    expect(snap.projects.some((p) => p.code === "NPI")).toBe(false); // tvVisible=false
  });
});

describe("tasks", () => {
  it("creates, completes, reschedules and deletes a task", async () => {
    const created = await repo.createTask(users.engineer, { title: "Test task", priority: "HIGH", dependsOn: [] });
    if ("error" in created) throw new Error(created.error);
    const done = await repo.updateTask(users.engineer, created.id, { status: "DONE" });
    expect("error" in done ? null : done.completedAt).toBeTruthy();
    const moved = await repo.updateTask(users.engineer, created.id, { dueDate: "2030-01-01", status: "TODO" });
    expect("error" in moved ? null : moved.dueDate).toBe("2030-01-01");
    expect(await repo.deleteTask(users.engineer, created.id)).toEqual({ ok: true });
  });
  it("prevents engineers from editing other people's tasks", async () => {
    const t = await repo.createTask(users.manager, { title: "Manager task", priority: "LOW", dependsOn: [] });
    if ("error" in t) throw new Error(t.error);
    const r = await repo.updateTask(users.engineer, t.id, { status: "DONE" });
    expect("error" in r && r.status).toBe(404);
  });
  it("blocks completing a task with unfinished dependencies", async () => {
    const a = await repo.createTask(users.engineer, { title: "A", priority: "LOW", dependsOn: [] });
    if ("error" in a) throw new Error();
    const b = await repo.createTask(users.engineer, { title: "B", priority: "LOW", dependsOn: [a.id] });
    if ("error" in b) throw new Error();
    const r = await repo.updateTask(users.engineer, b.id, { status: "DONE" });
    expect("error" in r && r.status).toBe(409);
  });
  it("refuses to link a task to a project above clearance", async () => {
    const all = await repo.listProjects(users.admin);
    const restricted = all.projects.find((p) => p.classification === "RESTRICTED")!;
    const r = await repo.createTask(users.engineer, { title: "x", priority: "LOW", dependsOn: [], projectId: restricted.id });
    expect("error" in r).toBe(true);
  });
});

describe("weekly report draft", () => {
  it("is labelled DRAFT and respects clearance", async () => {
    const md = await repo.buildWeeklyReport(users.engineer);
    expect(md).toMatch(/DRAFT/);
    expect(md).not.toMatch(/NPI/);
    expect(await repo.buildWeeklyReport(users.manager)).toMatch(/NPI/);
  });
});
