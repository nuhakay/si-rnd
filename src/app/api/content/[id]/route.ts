import { requireApiUser, jsonError } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";
import { applyContentAction, type WorkflowResult } from "@/lib/content/workflow";
import { contentActionSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";
import { audit } from "@/lib/audit";

/** POST a workflow action. Permission for the specific action is enforced inside applyContentAction. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, "content:read");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await parseBody(req, contentActionSchema);
  if (body.error) return body.error;

  const result = await getStore().update<WorkflowResult | null>((db) => {
    const idx = db.content.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const r = applyContentAction(db.content[idx], body.data, auth.user);
    if (r.ok) db.content[idx] = r.item;
    return r;
  });
  if (!result) return jsonError(404, "Content item not found");
  await audit({
    actor: auth.user,
    action: `CONTENT_${body.data.action}`,
    outcome: result.ok ? "SUCCESS" : result.status === 403 ? "DENIED" : "FAILURE",
    target: id,
    detail: result.ok ? result.summary : result.error,
  });
  if (!result.ok) return jsonError(result.status, result.error);
  return ok({ item: result.item, summary: result.summary });
}
