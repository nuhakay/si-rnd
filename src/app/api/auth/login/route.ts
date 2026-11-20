import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions, toPublicUser, clientIp, jsonError } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/token";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation";
import { parseBody } from "@/lib/http";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
let dummyHash: Promise<string> | null = null;

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = [new URL(req.url).origin, process.env.APP_ORIGIN].filter(Boolean);
  if (!origin || !allowed.includes(origin)) return jsonError(403, "Cross-origin request blocked");

  const body = await parseBody(req, loginSchema);
  if (body.error) return body.error;
  const { username, password } = body.data;
  const ip = (await clientIp()) ?? "unknown";

  // Per IP+user (5 / 15 min) and per user across all IPs (20 / 15 min, resists X-Forwarded-For rotation).
  const ipLimit = rateLimit(`login:${ip}:${username}`, 5, 15 * 60_000);
  const userLimit = ipLimit.ok ? rateLimit(`login-user:${username}`, 20, 15 * 60_000) : ipLimit;
  const limit = ipLimit.ok ? userLimit : ipLimit;
  if (!limit.ok) {
    await audit({ action: "LOGIN_RATE_LIMITED", outcome: "DENIED", target: username, ip });
    return NextResponse.json({ error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.` }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const db = await getStore().read();
  const user = db.users.find((u) => u.username === username && u.active);
  // Constant-ish time: always run a hash comparison, even for unknown users.
  dummyHash ??= hashPassword("not-a-real-password-placeholder");
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid) {
    await audit({ action: "LOGIN", outcome: "FAILURE", target: username, ip });
    return jsonError(401, "Invalid username or password");
  }
  resetRateLimit(`login:${ip}:${username}`);
  const { token, expiresAt } = await createSession(user.id);
  const pub = toPublicUser(user);
  await audit({ actor: pub, action: "LOGIN", outcome: "SUCCESS", ip });
  const res = NextResponse.json({ user: pub, redirect: user.role === "TV_VIEWER" ? "/tv" : "/dashboard" });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
