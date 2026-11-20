import { requireApiUser } from "@/lib/auth/session";
import { listNotes, addNote } from "@/lib/data/repo";
import { noteSchema } from "@/lib/validation";
import { parseBody, ok } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await requireApiUser(req, "notes:write");
  if (auth.error) return auth.error;
  return ok({ notes: await listNotes(auth.user) });
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req, "notes:write");
  if (auth.error) return auth.error;
  const body = await parseBody(req, noteSchema);
  if (body.error) return body.error;
  return ok({ note: await addNote(auth.user, body.data.text) }, 201);
}
