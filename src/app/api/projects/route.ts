import { requireApiUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/repo";
import { ok } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "projects:read");
  if (auth.error) return auth.error;
  return ok(await listProjects(auth.user));
}
