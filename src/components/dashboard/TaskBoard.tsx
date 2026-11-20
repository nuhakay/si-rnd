"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CalendarClock, Plus, Trash2, Circle, Ban, Loader } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types";
import { Badge, Button, EmptyState, cx, DemoBadge } from "@/components/ui";
import { relativeDue } from "@/lib/time";

const PRI_TONE: Record<TaskPriority, "danger" | "amber" | "cyan" | "muted"> = { CRITICAL: "danger", HIGH: "amber", MEDIUM: "cyan", LOW: "muted" };
const STATUS_ICON: Record<TaskStatus, typeof Circle> = { TODO: Circle, IN_PROGRESS: Loader, BLOCKED: Ban, DONE: Check };

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export function TaskBoard({
  initialTasks, projects, canWrite, currentUserId, today, mode = "list", showCreate = true, limit,
}: {
  initialTasks: Task[];
  projects: { id: string; code: string }[];
  canWrite: boolean;
  currentUserId: string;
  today: string;
  mode?: "list" | "board";
  showCreate?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const projectCode = (id?: string) => projects.find((p) => p.id === id)?.code;

  const mutate = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const update = (id: string, patch: Partial<Pick<Task, "status" | "priority">> & { dueDate?: string | null }) =>
    mutate(async () => {
      const { task } = await api(`/api/tasks/${id}`, "PATCH", patch);
      setTasks((ts) => ts.map((t) => (t.id === id ? task : t)));
    });

  const remove = (id: string) =>
    mutate(async () => {
      await api(`/api/tasks/${id}`, "DELETE");
      setTasks((ts) => ts.filter((t) => t.id !== id));
    });

  const create = (form: HTMLFormElement) =>
    mutate(async () => {
      const fd = new FormData(form);
      const body: Record<string, unknown> = { title: fd.get("title"), priority: fd.get("priority") };
      if (fd.get("dueDate")) body.dueDate = fd.get("dueDate");
      if (fd.get("projectId")) body.projectId = fd.get("projectId");
      const { task } = await api("/api/tasks", "POST", body);
      setTasks((ts) => [task, ...ts]);
      form.reset();
    });

  const editable = (t: Task) => canWrite && t.ownerId === currentUserId;

  const row = (t: Task) => {
    const Icon = STATUS_ICON[t.status];
    const overdue = t.status !== "DONE" && t.dueDate && t.dueDate < today;
    const mine = editable(t) || canWrite;
    return (
      <li key={t.id} className={cx("group rounded-lg border border-line bg-bg/40 px-3 py-2", t.status === "DONE" && "opacity-60")}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            disabled={!mine}
            onClick={() => update(t.id, { status: t.status === "DONE" ? "TODO" : "DONE" })}
            aria-label={t.status === "DONE" ? `Reopen ${t.title}` : `Complete ${t.title}`}
            className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border", t.status === "DONE" ? "border-teal bg-teal/20 text-teal" : "border-cyan/50 text-cyan hover:bg-cyan/10")}
          >
            <Icon size={13} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={cx("text-sm text-ink", t.status === "DONE" && "line-through")}>{t.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Badge tone={PRI_TONE[t.priority]}>{t.priority}</Badge>
              {t.status === "BLOCKED" && <Badge tone="danger">Blocked</Badge>}
              {t.status === "IN_PROGRESS" && <Badge tone="teal">In progress</Badge>}
              {projectCode(t.projectId) && <span className="tabular text-cyan">{projectCode(t.projectId)}</span>}
              {t.dueDate && <span className={overdue ? "text-danger" : undefined}>{relativeDue(t.dueDate, today)}</span>}
              {t.dependsOn.length > 0 && <span>· {t.dependsOn.length} dependency</span>}
              {t.isDemo && <DemoBadge />}
            </div>
            {editingDate === t.id && (
              <div className="mt-2 flex items-center gap-2">
                <label className="sr-only" htmlFor={`d-${t.id}`}>New due date</label>
                <input id={`d-${t.id}`} type="date" defaultValue={t.dueDate} className="h-8 px-2 text-xs" onChange={(e) => { if (e.target.value) { void update(t.id, { dueDate: e.target.value }); setEditingDate(null); } }} />
                <button type="button" className="text-xs text-muted" onClick={() => setEditingDate(null)}>Cancel</button>
              </div>
            )}
          </div>
          {mine && (
            <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <label className="sr-only" htmlFor={`s-${t.id}`}>Status</label>
              <select id={`s-${t.id}`} value={t.status} onChange={(e) => update(t.id, { status: e.target.value as TaskStatus })} className="h-7 px-1 text-xs">
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
              </select>
              <button type="button" onClick={() => setEditingDate(t.id)} aria-label={`Reschedule ${t.title}`} className="p-1 text-muted hover:text-cyan"><CalendarClock size={15} /></button>
              <button type="button" onClick={() => { if (confirm(`Delete “${t.title}”?`)) void remove(t.id); }} aria-label={`Delete ${t.title}`} className="p-1 text-muted hover:text-danger"><Trash2 size={15} /></button>
            </div>
          )}
        </div>
      </li>
    );
  };

  const shown = limit ? tasks.filter((t) => t.status !== "DONE").slice(0, limit) : tasks;

  return (
    <div className="space-y-3">
      {showCreate && canWrite && (
        <form onSubmit={(e) => { e.preventDefault(); void create(e.currentTarget); }} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="sr-only" htmlFor="new-title">New task</label>
          <input id="new-title" name="title" required maxLength={200} placeholder="Add a task…" className="col-span-2 h-9 px-3 text-sm sm:col-span-1" />
          <label className="sr-only" htmlFor="new-priority">Priority</label>
          <select id="new-priority" name="priority" defaultValue="MEDIUM" className="h-9 px-2 text-sm">
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
          </select>
          <label className="sr-only" htmlFor="new-due">Due date</label>
          <input id="new-due" name="dueDate" type="date" defaultValue={today} className="h-9 px-2 text-sm" />
          <label className="sr-only" htmlFor="new-project">Project</label>
          <select id="new-project" name="projectId" defaultValue="" className="h-9 px-2 text-sm">
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
          <Button type="submit" className="h-9"><Plus size={15} /> Add</Button>
        </form>
      )}
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {shown.length === 0 ? (
        <EmptyState>No tasks here.</EmptyState>
      ) : mode === "board" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-line bg-panel/30 p-2">
              <p className="hud-label mb-2 px-1">{s.replace("_", " ")} · {shown.filter((t) => t.status === s).length}</p>
              <ul className="space-y-2">{shown.filter((t) => t.status === s).map(row)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">{shown.map(row)}</ul>
      )}
    </div>
  );
}
