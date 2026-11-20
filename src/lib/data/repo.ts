import "server-only";
import { randomUUID } from "node:crypto";
import type { CalendarEvent, ContentItem, Database, Grant, Project, PublicUser, ResearchDocument, Task } from "@/types";
import { can, canAccessClassification, filterByClearance } from "@/lib/permissions";
import { daysUntil, klDateString, formatKlDate } from "@/lib/time";
import { getStore } from "./store";
import type { z } from "zod";
import type { taskCreateSchema, taskUpdateSchema, contentCreateSchema } from "@/lib/validation";

/**
 * Data-access layer. Every function takes the acting user and applies
 * role + classification rules here (server-side), so pages and API routes
 * cannot accidentally leak data the role may not see.
 */

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === "DONE") - Number(b.status === "DONE") ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  );
}

const seesAllTasks = (u: PublicUser) => u.role === "ADMIN" || u.role === "R&D_MANAGER" || u.role === "MANAGEMENT_VIEWER";

function visibleTasks(db: Database, user: PublicUser): Task[] {
  if (!can(user.role, "tasks:read")) return [];
  const projectIds = new Set(filterByClearance(user.role, db.projects).visible.map((p) => p.id));
  return db.tasks.filter((t) => (seesAllTasks(user) || t.ownerId === user.id) && (!t.projectId || projectIds.has(t.projectId)));
}

export async function listTasks(user: PublicUser): Promise<Task[]> {
  return sortTasks(visibleTasks(await getStore().read(), user));
}

export async function createTask(user: PublicUser, input: z.infer<typeof taskCreateSchema>): Promise<Task | { error: string }> {
  return getStore().update((db) => {
    if (input.projectId) {
      const p = db.projects.find((x) => x.id === input.projectId);
      if (!p || !canAccessClassification(user.role, p.classification)) return { error: "Unknown project" };
    }
    const now = new Date().toISOString();
    const task: Task = { id: randomUUID(), status: "TODO", ownerId: user.id, createdAt: now, updatedAt: now, isDemo: false, ...input };
    db.tasks.push(task);
    return task;
  });
}

function canModifyTask(user: PublicUser, task: Task) {
  return can(user.role, "tasks:write") && (task.ownerId === user.id || user.role === "ADMIN" || user.role === "R&D_MANAGER");
}

export async function updateTask(user: PublicUser, id: string, patch: z.infer<typeof taskUpdateSchema>): Promise<Task | { error: string; status: number }> {
  return getStore().update((db) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task || !visibleTasks(db, user).some((t) => t.id === id)) return { error: "Task not found", status: 404 };
    if (!canModifyTask(user, task)) return { error: "You cannot modify this task", status: 403 };
    if (patch.status === "DONE" && task.dependsOn.some((dep) => db.tasks.find((t) => t.id === dep)?.status !== "DONE")) {
      return { error: "Complete dependent tasks first", status: 409 };
    }
    const { dueDate, projectId, ...rest } = patch;
    Object.assign(task, rest);
    if (dueDate !== undefined) task.dueDate = dueDate ?? undefined;
    if (projectId !== undefined) task.projectId = projectId ?? undefined;
    if (patch.status === "DONE") task.completedAt = new Date().toISOString();
    else if (patch.status) task.completedAt = undefined;
    task.updatedAt = new Date().toISOString();
    return task;
  });
}

export async function deleteTask(user: PublicUser, id: string): Promise<{ ok: true } | { error: string; status: number }> {
  return getStore().update((db) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task || !visibleTasks(db, user).some((t) => t.id === id)) return { error: "Task not found", status: 404 };
    if (!canModifyTask(user, task)) return { error: "You cannot delete this task", status: 403 };
    db.tasks = db.tasks.filter((t) => t.id !== id);
    db.tasks.forEach((t) => (t.dependsOn = t.dependsOn.filter((d) => d !== id)));
    return { ok: true as const };
  });
}

/** Strip fields a role may not see from a project, and filter linked docs. */
function shapeProject(p: Project, user: PublicUser, db: Database): Project {
  return { ...p, documentIds: p.documentIds.filter((d) => { const doc = db.documents.find((x) => x.id === d); return doc && canAccessClassification(user.role, doc.classification); }) };
}

export async function listProjects(user: PublicUser): Promise<{ projects: Project[]; hiddenCount: number }> {
  if (!can(user.role, "projects:read")) return { projects: [], hiddenCount: 0 };
  const db = await getStore().read();
  const { visible, hiddenCount } = filterByClearance(user.role, db.projects);
  return { projects: visible.map((p) => shapeProject(p, user, db)), hiddenCount };
}

export async function getProject(user: PublicUser, id: string): Promise<{ project: Project; documents: ResearchDocument[]; tasks: Task[]; objectives: Database["objectives"] } | null> {
  if (!can(user.role, "projects:read")) return null;
  const db = await getStore().read();
  const p = db.projects.find((x) => x.id === id || x.code.toLowerCase() === id.toLowerCase());
  if (!p || !canAccessClassification(user.role, p.classification)) return null;
  const shaped = shapeProject(p, user, db);
  return {
    project: shaped,
    documents: db.documents.filter((d) => shaped.documentIds.includes(d.id)),
    tasks: sortTasks(visibleTasks(db, user).filter((t) => t.projectId === p.id)),
    objectives: db.objectives.filter((o) => p.objectiveIds.includes(o.id)),
  };
}

export function projectNeedsAttention(p: Project, today = klDateString()): string[] {
  const reasons: string[] = [];
  if (p.health !== "GREEN") reasons.push(`health ${p.health}`);
  const overdue = p.milestones.filter((m) => m.status !== "DONE" && daysUntil(m.dueDate, today) < 0);
  if (overdue.length) reasons.push(`${overdue.length} overdue milestone${overdue.length > 1 ? "s" : ""}`);
  if (p.risks.some((r) => r.severity === "HIGH")) reasons.push("high risk open");
  return reasons;
}

export async function listDocuments(user: PublicUser): Promise<{ documents: ResearchDocument[]; hiddenCount: number }> {
  if (!can(user.role, "research:read")) return { documents: [], hiddenCount: 0 };
  const db = await getStore().read();
  const { visible, hiddenCount } = filterByClearance(user.role, db.documents);
  return { documents: visible.sort((a, b) => b.date.localeCompare(a.date)), hiddenCount };
}

export async function listGrants(user: PublicUser): Promise<{ grants: Grant[]; hiddenCount: number }> {
  if (!can(user.role, "grants:read")) return { grants: [], hiddenCount: 0 };
  const db = await getStore().read();
  const { visible, hiddenCount } = filterByClearance(user.role, db.grants);
  return { grants: visible.sort((a, b) => a.deadline.localeCompare(b.deadline)), hiddenCount };
}

export async function getStrategy(user: PublicUser) {
  if (!can(user.role, "mission:read")) return null;
  const db = await getStore().read();
  const visibleProjects = filterByClearance(user.role, db.projects).visible;
  return { strategy: db.strategy, objectives: db.objectives, projects: visibleProjects.map((p) => ({ id: p.id, code: p.code, title: p.title, objectiveIds: p.objectiveIds, progress: p.progress })) };
}

export async function listEvents(user: PublicUser): Promise<CalendarEvent[]> {
  if (!can(user.role, "calendar:read")) return [];
  const db = await getStore().read();
  return filterByClearance(user.role, db.events).visible.sort((a, b) => a.start.localeCompare(b.start));
}

export async function listContent(user: PublicUser): Promise<ContentItem[]> {
  if (!can(user.role, "content:read")) return [];
  return (await getStore().read()).content;
}

export async function createContent(user: PublicUser, input: z.infer<typeof contentCreateSchema>): Promise<ContentItem> {
  return getStore().update((db) => {
    const item: ContentItem = {
      id: randomUUID(), ...input, stage: "TOPIC_RESEARCH", status: "DRAFT", authorId: user.id, authorName: user.displayName,
      storyboard: [], narrationStatus: "NOT_STARTED", canvaStatus: "NOT_STARTED", history: [], isDemo: false,
    };
    db.content.unshift(item);
    return item;
  });
}

export async function getNotifications(user: PublicUser) {
  const db = await getStore().read();
  return user.role === "TV_VIEWER" ? db.notifications.filter((n) => n.tvSafe) : db.notifications;
}

export async function listNotes(user: PublicUser) {
  const db = await getStore().read();
  return db.notes.filter((n) => n.ownerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNote(user: PublicUser, text: string) {
  return getStore().update((db) => {
    const note = { id: randomUUID(), ownerId: user.id, text, createdAt: new Date().toISOString() };
    db.notes.push(note);
    return note;
  });
}

export async function deleteNote(user: PublicUser, id: string) {
  return getStore().update((db) => {
    const before = db.notes.length;
    db.notes = db.notes.filter((n) => !(n.id === id && n.ownerId === user.id));
    return before !== db.notes.length;
  });
}

/** Upcoming deadlines across visible milestones, grants and tasks. */
export async function upcomingDeadlines(user: PublicUser, today = klDateString()) {
  const db = await getStore().read();
  const projects = can(user.role, "projects:read") ? filterByClearance(user.role, db.projects).visible : [];
  const grants = can(user.role, "grants:read") ? filterByClearance(user.role, db.grants).visible : [];
  const items: { kind: "MILESTONE" | "GRANT" | "TASK"; title: string; date: string; ref: string; days: number }[] = [];
  for (const p of projects) for (const m of p.milestones) if (m.status !== "DONE") items.push({ kind: "MILESTONE", title: `${p.code}: ${m.title}`, date: m.dueDate, ref: `/projects/${p.id}`, days: daysUntil(m.dueDate, today) });
  for (const g of grants) if (g.outcome === "NOT_SUBMITTED") items.push({ kind: "GRANT", title: g.programme, date: g.deadline, ref: "/grants", days: daysUntil(g.deadline, today) });
  for (const t of visibleTasks(db, user)) if (t.dueDate && t.status !== "DONE") items.push({ kind: "TASK", title: t.title, date: t.dueDate, ref: "/tasks", days: daysUntil(t.dueDate, today) });
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Sanitised snapshot for the TV display: whitelisted fields only, no names, no descriptions, no risks. */
export async function getTvSnapshot(today = klDateString()) {
  const db = await getStore().read();
  const projects = db.projects.filter((p) => p.tvVisible);
  return {
    generatedAt: new Date().toISOString(),
    projects: projects.map((p) => ({ code: p.code, title: p.title, stage: p.stage, health: p.health, progress: p.progress })),
    milestones: projects
      .flatMap((p) => p.milestones.filter((m) => m.status !== "DONE" && daysUntil(m.dueDate, today) >= 0).map((m) => ({ code: p.code, title: m.title, dueDate: m.dueDate })))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6),
    events: db.events
      .filter((e) => (e.classification === "PUBLIC" || e.classification === "INTERNAL") && e.start.slice(0, 10) >= today)
      .slice(0, 6)
      .map((e) => ({ title: e.title, start: e.start, kind: e.kind })),
    priorities: sortTasks(db.tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate <= today))
      .filter((t) => !t.projectId || projects.some((p) => p.id === t.projectId))
      .slice(0, 3)
      .map((t) => ({ title: t.title, priority: t.priority })),
    notifications: db.notifications.filter((n) => n.tvSafe).map((n) => ({ level: n.level, message: n.message })),
    isDemo: db.projects.some((p) => p.isDemo),
  };
}
export type TvSnapshot = Awaited<ReturnType<typeof getTvSnapshot>>;

/** Draft weekly report (markdown) built only from data the user may see. */
export async function buildWeeklyReport(user: PublicUser, today = klDateString()): Promise<string> {
  const db = await getStore().read();
  const { projects } = await listProjects(user);
  const tasks = visibleTasks(db, user);
  const done = tasks.filter((t) => t.status === "DONE" && t.completedAt && daysUntil(klDateString(new Date(t.completedAt)), today) >= -7);
  const overdue = tasks.filter((t) => t.status !== "DONE" && t.dueDate && daysUntil(t.dueDate, today) < 0);
  const deadlines = (await upcomingDeadlines(user, today)).filter((d) => d.days >= 0 && d.days <= 14);
  const demo = projects.some((p) => p.isDemo);
  const lines = [
    `# DRAFT — R&D Weekly Report`,
    `Week ending ${formatKlDate(today)} · Prepared by ${user.displayName} · Status: DRAFT (not approved)`,
    demo ? `\n> Contains DEMONSTRATION data. Verify every figure before circulating.` : "",
    `\n## Project status`,
    ...projects.map((p) => `- **${p.code} ${p.title}** — ${p.stage.toLowerCase()}, ${p.progress}% (health ${p.health})${projectNeedsAttention(p, today).length ? ` — attention: ${projectNeedsAttention(p, today).join(", ")}` : ""}`),
    `\n## Completed this week (${done.length})`,
    ...(done.length ? done.map((t) => `- ${t.title}`) : ["- None recorded"]),
    `\n## Overdue (${overdue.length})`,
    ...(overdue.length ? overdue.map((t) => `- ${t.title} (due ${formatKlDate(t.dueDate!)})`) : ["- None"]),
    `\n## Next 14 days`,
    ...(deadlines.length ? deadlines.map((d) => `- ${formatKlDate(d.date)} — ${d.title}`) : ["- No deadlines"]),
    `\n## Notes for management`,
    `- _(to be written by the R&D Manager)_`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}
