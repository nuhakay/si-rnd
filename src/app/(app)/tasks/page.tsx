import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listTasks, listProjects } from "@/lib/data/repo";
import { klDateString } from "@/lib/time";
import { HolographicPanel } from "@/components/layout/HolographicPanel";
import { TaskBoard } from "@/components/dashboard/TaskBoard";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requirePageUser("tasks:read");
  const [tasks, { projects }] = await Promise.all([listTasks(user), listProjects(user)]);
  const scope = user.role === "R&D_ENGINEER" ? "Your tasks" : "All department tasks";
  return (
    <>
      <PageHeader title="Tasks" subtitle={`${scope}. Create, complete, reschedule or change status. Tasks with unfinished dependencies cannot be completed.`} />
      <HolographicPanel>
        <TaskBoard initialTasks={tasks} projects={projects.map((p) => ({ id: p.id, code: p.code }))} canWrite={can(user.role, "tasks:write")} currentUserId={user.id} today={klDateString()} mode="board" />
      </HolographicPanel>
    </>
  );
}
