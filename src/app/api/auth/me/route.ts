import { getCurrentUser, jsonError } from "@/lib/auth/session";
import { permissionsFor } from "@/lib/permissions";
import { ok } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Authentication required");
  return ok({ user, permissions: permissionsFor(user.role) });
}
