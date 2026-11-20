import { requireApiUser } from "@/lib/auth/session";
import { buildWeeklyReport } from "@/lib/data/repo";
import { ok } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "reports:generate");
  if (auth.error) return auth.error;
  const markdown = await buildWeeklyReport(auth.user);
  await audit({ actor: auth.user, action: "REPORT_WEEKLY_DRAFT", outcome: "SUCCESS" });
  return ok({ markdown });
}
