import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AuditEntry, PublicUser } from "@/types";
import { dataDir } from "@/lib/data/store";

/** Append-only JSON-lines audit log (DATA_DIR/audit.log). Never log passwords or secrets. */
export async function audit(entry: Omit<AuditEntry, "id" | "at" | "actorId" | "actorName"> & { actor?: PublicUser | null }) {
  const { actor, ...rest } = entry;
  const line: AuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actorId: actor?.id ?? null,
    actorName: actor?.username ?? null,
    ...rest,
    detail: rest.detail?.slice(0, 500),
  };
  try {
    await fs.mkdir(dataDir(), { recursive: true, mode: 0o700 });
    await fs.appendFile(path.join(dataDir(), "audit.log"), JSON.stringify(line) + "\n", { mode: 0o600 });
  } catch (err) {
    console.error("[audit] failed to write audit entry", err);
  }
}

export async function readAudit(limit = 200): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(path.join(dataDir(), "audit.log"), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((l) => JSON.parse(l) as AuditEntry)
      .reverse();
  } catch {
    return [];
  }
}
