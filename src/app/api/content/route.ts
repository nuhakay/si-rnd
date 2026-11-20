import { requireApiUser } from "@/lib/auth/session";
import { listContent, createContent } from "@/lib/data/repo";
import { contentCreateSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "content:read");
  if (auth.error) return auth.error;
  return ok({ content: await listContent(auth.user) });
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req, "content:edit");
  if (auth.error) return auth.error;
  const body = await parseBody(req, contentCreateSchema);
  if (body.error) return body.error;
  const item = await createContent(auth.user, body.data);
  await audit({ actor: auth.user, action: "CONTENT_CREATE", outcome: "SUCCESS", target: item.id });
  return ok({ item }, 201);
}
