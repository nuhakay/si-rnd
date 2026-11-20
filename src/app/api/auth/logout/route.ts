import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, getCurrentUser } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/token";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.APP_ORIGIN) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  const jar = await cookies();
  const user = await getCurrentUser();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  if (user) await audit({ actor: user, action: "LOGOUT", outcome: "SUCCESS" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0), sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}
