import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionId, verifySessionToken, newSessionId } from "@/lib/auth/token";
import { rateLimit } from "@/lib/auth/rate-limit";

describe("password hashing", () => {
  it("verifies correct passwords and rejects wrong ones", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("salts hashes", async () => {
    expect(await hashPassword("x")).not.toBe(await hashPassword("x"));
  });
  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false);
  });
});

describe("session tokens", () => {
  const secret = "s".repeat(40);
  it("round-trips a signed id", () => {
    const id = newSessionId();
    expect(verifySessionToken(signSessionId(id, secret), secret)).toBe(id);
  });
  it("rejects tampered or foreign tokens", () => {
    const t = signSessionId("abc", secret);
    expect(verifySessionToken(t.replace("abc", "abd"), secret)).toBeNull();
    expect(verifySessionToken(t, "o".repeat(40))).toBeNull();
    expect(verifySessionToken("abc", secret)).toBeNull();
    expect(verifySessionToken(undefined, secret)).toBeNull();
    expect(verifySessionToken("a".repeat(500), secret)).toBeNull();
  });
});

describe("login rate limiting", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 5, 1000, 10).ok).toBe(false);
    expect(rateLimit(key, 5, 1000, 2000).ok).toBe(true);
  });
});
