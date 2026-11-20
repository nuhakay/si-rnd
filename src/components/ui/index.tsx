import type { Classification, Health } from "@/types";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const TONES = {
  cyan: "border-cyan/40 text-cyan bg-cyan/10",
  teal: "border-teal/40 text-teal bg-teal/10",
  royal: "border-royal/40 text-[#8ab4ff] bg-royal/10",
  violet: "border-violet/40 text-[#b9a4ff] bg-violet/10",
  amber: "border-amber/40 text-amber bg-amber/10",
  danger: "border-danger/40 text-danger bg-danger/10",
  muted: "border-white/15 text-muted bg-white/5",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "cyan", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function DemoBadge() {
  return <Badge tone="violet" title="Demonstration data — not verified company information">Demo</Badge>;
}

const CLS_TONE: Record<Classification, Tone> = { PUBLIC: "teal", INTERNAL: "royal", CONFIDENTIAL: "amber", RESTRICTED: "danger" };
export function ClassificationBadge({ value }: { value: Classification }) {
  return <Badge tone={CLS_TONE[value]}>{value}</Badge>;
}

const HEALTH_TONE: Record<Health, string> = { GREEN: "bg-teal shadow-[0_0_8px_var(--color-teal)]", AMBER: "bg-amber shadow-[0_0_8px_var(--color-amber)]", RED: "bg-danger shadow-[0_0_8px_var(--color-danger)]" };
export function HealthDot({ health, label = true }: { health: Health; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className={cx("h-2 w-2 rounded-full", HEALTH_TONE[health])} />
      {label && <span>{health === "GREEN" ? "On track" : health === "AMBER" ? "Watch" : "At risk"}</span>}
      {!label && <span className="sr-only">{health}</span>}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="hud-label">SI Acoustic · R&amp;D</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">{children}</p>;
}

export function Button({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-cyan/15 text-cyan border-cyan/50 hover:bg-cyan/25",
    ghost: "bg-transparent text-muted border-line hover:text-ink hover:border-cyan/40",
    danger: "bg-danger/10 text-danger border-danger/40 hover:bg-danger/20",
  }[variant];
  return <button {...props} className={cx("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", v, className)} />;
}
