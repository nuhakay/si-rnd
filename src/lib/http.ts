import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { formatZodError } from "@/lib/validation";
import { jsonError } from "@/lib/auth/session";

const MAX_BODY = 32 * 1024;

export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return { error: jsonError(413, "Request too large") };
  if (!req.headers.get("content-type")?.includes("application/json")) return { error: jsonError(415, "Expected application/json") };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return { error: jsonError(413, "Request too large") };
    raw = JSON.parse(text);
  } catch {
    return { error: jsonError(400, "Invalid JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: jsonError(422, formatZodError(parsed.error)) };
  return { data: parsed.data };
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
