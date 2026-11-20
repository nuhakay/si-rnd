import { requireApiUser } from "@/lib/auth/session";
import { getTvSnapshot } from "@/lib/data/repo";
import { ok } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "tv:view");
  if (auth.error) return auth.error;
  return ok(await getTvSnapshot());
}
