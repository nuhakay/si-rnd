import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Session cookie token = "<sessionId>.<HMAC-SHA256(sessionId)>".
 * The HMAC lets the proxy reject forged cookies cheaply; the session record in
 * the data store is still checked server-side on every request (revocable, expiring).
 * Self-contained (no app imports) so it can run inside proxy.ts.
 */
const DEV_FALLBACK = "dev-only-insecure-session-secret-change-me-0123456789";

export function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (≥32 chars) in production. See .env.example.");
  }
  return DEV_FALLBACK;
}

export function newSessionId(): string {
  return randomBytes(32).toString("base64url");
}

function mac(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

export function signSessionId(id: string, secret = getSessionSecret()): string {
  return `${id}.${mac(id, secret)}`;
}

/** Returns the session id if the signature is valid, otherwise null. */
export function verifySessionToken(token: string | undefined | null, secret = getSessionSecret()): string | null {
  if (!token || token.length > 200) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = mac(id, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export const SESSION_COOKIE = "sia_session";
