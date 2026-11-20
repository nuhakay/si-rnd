import { requireApiUser } from "@/lib/auth/session";
import { listTasks, createTask } from "@/lib/data/repo";
import { taskCreateSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";
import { jsonError } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "tasks:read");
  if (auth.error) return auth.error;
  return ok({ tasks: await listTasks(auth.user) });
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req, "tasks:write");
  if (auth.error) return auth.error;
  const body = await parseBody(req, taskCreateSchema);
  if (body.error) return body.error;
  const result = await createTask(auth.user, body.data);
  if ("error" in result) return jsonError(422, result.error);
  await audit({ actor: auth.user, action: "TASK_CREATE", outcome: "SUCCESS", target: result.id });
  return ok({ task: result }, 201);
}
