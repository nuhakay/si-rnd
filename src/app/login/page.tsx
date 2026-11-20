import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AIOrb } from "@/components/ai/AIOrb";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(user.role === "TV_VIEWER" ? "/tv" : "/dashboard");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const showDemo = process.env.NODE_ENV !== "production";
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="holo-panel grid w-full max-w-4xl overflow-hidden md:grid-cols-2">
        <div className="hidden flex-col items-center justify-center gap-4 border-r border-line bg-bg-2/40 p-8 md:flex">
          <AIOrb size={260} />
          <p className="text-center text-sm text-muted">AURA — Acoustic Unified Research Assistant</p>
        </div>
        <div className="p-6 sm:p-10">
          <p className="font-display text-sm font-bold tracking-[0.22em] text-cyan glow-text">SI ACOUSTIC</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">R&amp;D Command Centre</h1>
          <p className="mt-1 text-sm text-muted">Private system. Authorised SI Acoustic personnel only. Activity is logged.</p>
          <LoginForm next={safeNext} />
          {showDemo && (
            <div className="mt-6 rounded-lg border border-violet/40 bg-violet/10 p-3 text-xs text-[#cfc2ff]">
              <p className="font-semibold">Development demo accounts</p>
              <p className="mt-1">admin · manager · engineer · viewer · tv — password <code className="tabular">Aura#Demo2026</code> (unless SEED_DEMO_PASSWORD is set). Hidden in production.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
