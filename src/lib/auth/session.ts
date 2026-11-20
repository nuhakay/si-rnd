import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { PublicUser, User } from "@/types";
import { can, type Permission } from "@/lib/permissions";
import { getStore } from "@/lib/data/store";
import { newSessionId, signSessionId, verifySessionToken, SESSION_COOKIE } from "./token";
import { audit } from "@/lib/audit";

export const toPublicUser = (u: User): PublicUser => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role });

function ttlMs() {
  const h = Number(process.env.SESSION_TTL_HOURS || 12);
  return (Number.isFinite(h) && h > 0 && h <= 24 * 30 ? h : 12) * 3_600_000;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const id = newSessionId();
  const now = Date.now();
  const expiresAt = new Date(now + ttlMs());
  await getStore().update((db) => {
    db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > now); // prune expired
    db.sessions.push({ id, userId, createdAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString() });
  });
  return { token: signSessionId(id), expiresAt };
}

export async function destroySession(token: string | undefined) {
  const id = verifySessionToken(token);
  if (!id) return;
  await getStore().update((db) => {
    db.sessions = db.sessions.filter((s) => s.id !== id);
  });
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Resolve the signed-in user from the session cookie (server-side, every request). */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const id = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const db = await getStore().read();
  const session = db.sessions.find((s) => s.id === id);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  const user = db.users.find((u) => u.id === session.userId && u.active);
  return user ? toPublicUser(user) : null;
}

/** For server pages/layouts: redirect when unauthenticated or unauthorised. */
export async function requirePageUser(permission: Permission = "dashboard:view"): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, permission)) {
    if (user.role === "TV_VIEWER") redirect("/tv");
    redirect("/dashboard?denied=1");
  }
  return user;
}

export async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * For API routes: authenticate, authorise, and (for mutations) check Origin to
 * block cross-site requests. Returns the user or a ready-made error response.
 */
export async function requireApiUser(
  req: Request,
  permission: Permission,
): Promise<{ user: PublicUser; error?: never } | { user?: never; error: NextResponse }> {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const allowed = new Set([new URL(req.url).origin, process.env.APP_ORIGIN].filter(Boolean) as string[]);
    if (!origin || !allowed.has(origin)) {
      await audit({ action: "CSRF_BLOCKED", outcome: "DENIED", target: new URL(req.url).pathname, detail: `origin=${origin}` });
      return { error: jsonError(403, "Cross-origin request blocked") };
    }
  }
  const user = await getCurrentUser();
  if (!user) return { error: jsonError(401, "Authentication required") };
  if (!can(user.role, permission)) {
    await audit({ actor: user, action: "PERMISSION_DENIED", outcome: "DENIED", target: new URL(req.url).pathname, detail: permission });
    return { error: jsonError(403, "You do not have permission for this action") };
  }
  return { user };
}
