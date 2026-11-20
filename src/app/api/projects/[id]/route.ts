import { requireApiUser, jsonError } from "@/lib/auth/session";
import { getProject } from "@/lib/data/repo";
import { ok } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, "projects:read");
  if (auth.error) return auth.error;
  const { id } = await params;
  const result = await getProject(auth.user, id);
  if (!result) {
    await audit({ actor: auth.user, action: "PROJECT_READ", outcome: "DENIED", target: id, detail: "not found or not cleared" });
    return jsonError(404, "Project not found");
  }
  return ok(result);
}
