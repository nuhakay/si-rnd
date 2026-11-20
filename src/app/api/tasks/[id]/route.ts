import { requireApiUser, jsonError } from "@/lib/auth/session";
import { updateTask, deleteTask } from "@/lib/data/repo";
import { taskUpdateSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiUser(req, "tasks:write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await parseBody(req, taskUpdateSchema);
  if (body.error) return body.error;
  const result = await updateTask(auth.user, id, body.data);
  if ("error" in result) {
    await audit({ actor: auth.user, action: "TASK_UPDATE", outcome: result.status === 403 ? "DENIED" : "FAILURE", target: id, detail: result.error });
    return jsonError(result.status, result.error);
  }
  await audit({ actor: auth.user, action: "TASK_UPDATE", outcome: "SUCCESS", target: id, detail: Object.keys(body.data).join(",") });
  return ok({ task: result });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireApiUser(req, "tasks:write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const result = await deleteTask(auth.user, id);
  if ("error" in result) return jsonError(result.status, result.error);
  await audit({ actor: auth.user, action: "TASK_DELETE", outcome: "SUCCESS", target: id });
  return ok({ ok: true });
}
