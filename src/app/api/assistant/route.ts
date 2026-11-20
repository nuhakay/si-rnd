import { requireApiUser } from "@/lib/auth/session";
import { listTasks, listProjects, upcomingDeadlines, listEvents, getStrategy } from "@/lib/data/repo";
import { interpret } from "@/lib/assistant/engine";
import { assistantSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";
import { klDateString } from "@/lib/time";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const auth = await requireApiUser(req, "assistant:use");
  if (auth.error) return auth.error;
  const body = await parseBody(req, assistantSchema);
  if (body.error) return body.error;
  const user = auth.user;
  const [tasks, { projects }, deadlines, events, strat] = await Promise.all([
    listTasks(user), listProjects(user), upcomingDeadlines(user), listEvents(user), getStrategy(user),
  ]);
  const reply = interpret(body.data.message, { user, now: new Date(), today: klDateString(), tasks, projects, deadlines, events, strategy: strat?.strategy ?? null });
  await audit({ actor: user, action: "ASSISTANT_QUERY", outcome: "SUCCESS", detail: `${reply.intent}/${reply.source}` });
  return ok({ reply });
}
