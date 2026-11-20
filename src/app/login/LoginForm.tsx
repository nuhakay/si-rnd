"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign-in failed");
      router.replace(json.redirect === "/tv" ? "/tv" : next || json.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="username" className="hud-label">Username</label>
        <input id="username" name="username" required autoComplete="username" autoCapitalize="none" className="mt-1 h-11 w-full px-3" />
      </div>
      <div>
        <label htmlFor="password" className="hud-label">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="mt-1 h-11 w-full px-3" />
      </div>
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy} className="h-11 w-full">
        <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
