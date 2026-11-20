import { requireApiUser, jsonError } from "@/lib/auth/session";
import { deleteNote } from "@/lib/data/repo";
import { ok } from "@/lib/http";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, "notes:write");
  if (auth.error) return auth.error;
  const removed = await deleteNote(auth.user, (await params).id);
  return removed ? ok({ ok: true }) : jsonError(404, "Note not found");
}
