import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * First line of defence: any non-public route without a validly-signed
 * session cookie is redirected to /login (pages) or gets 401 (API).
 * Full session + role checks still run server-side in every page and route.
 */
const PUBLIC = [/^\/login$/, /^\/api\/auth\/login$/, /^\/api\/health$/];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  let valid = false;
  try {
    valid = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value) !== null;
  } catch {
    valid = false; // missing SESSION_SECRET in production → deny
  }
  if (valid) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|fonts/).*)"],
};
