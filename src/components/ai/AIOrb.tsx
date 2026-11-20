import { cx } from "@/components/ui";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "error";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "AURA ready",
  listening: "Listening…",
  thinking: "Processing…",
  speaking: "Responding",
  error: "Attention",
};

/** Tick marks around a ring, generated once (pure SVG, no JS animation loop). */
function ticks(r: number, count: number, len: number, every = 5) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const l = i % every === 0 ? len * 1.8 : len;
    const x1 = 200 + Math.cos(a) * r, y1 = 200 + Math.sin(a) * r;
    const x2 = 200 + Math.cos(a) * (r - l), y2 = 200 + Math.sin(a) * (r - l);
    return <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />;
  });
}

/**
 * AURA core — original holographic HUD built from SVG + CSS keyframes.
 * Animations stop automatically under prefers-reduced-motion or low-motion mode.
 */
export function AIOrb({ state = "idle", size = 320, className, showLabel = true }: { state?: OrbState; size?: number | string; className?: string; showLabel?: boolean }) {
  const accent = state === "error" ? "var(--color-danger)" : state === "listening" ? "var(--color-teal)" : "var(--color-cyan)";
  return (
    <div className={cx("relative inline-grid place-items-center", state === "listening" && "listening", className)} style={{ width: size, maxWidth: "100%", aspectRatio: "1" }} role="img" aria-label={`AURA status: ${STATE_LABEL[state]}`}>
      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#eaffff" stopOpacity="0.95" />
            <stop offset="25%" stopColor={accent} stopOpacity="0.85" />
            <stop offset="65%" stopColor="#2979ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#050b17" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb-halo" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor={accent} stopOpacity="0" />
            <stop offset="80%" stopColor={accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="198" fill="url(#orb-halo)" />

        {/* outer tick ring */}
        <g className="ring-spin" stroke={accent} strokeOpacity="0.45" strokeWidth="1">{ticks(188, 120, 5)}</g>

        {/* segmented arc ring */}
        <g className="ring-spin-rev" fill="none" stroke={accent} strokeLinecap="round">
          <circle cx="200" cy="200" r="168" strokeWidth="3" strokeOpacity="0.7" strokeDasharray="60 26 8 26" />
        </g>

        {/* thin data ring with notches */}
        <g className="ring-spin-fast" fill="none">
          <circle cx="200" cy="200" r="148" stroke="#2979ff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="2 6" />
          <circle cx="200" cy="52" r="3.5" fill={accent} />
          <circle cx="348" cy="200" r="2.5" fill="#00f5d4" />
        </g>

        {/* purple accent arc */}
        <g className="ring-spin" fill="none">
          <path d="M 200 72 A 128 128 0 0 1 318 156" stroke="#805bff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
          <path d="M 82 244 A 128 128 0 0 1 72 200" stroke="#805bff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* inner ring */}
        <circle cx="200" cy="200" r="112" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1" />
        <g className="ring-spin-rev" stroke={accent} strokeOpacity="0.6" strokeWidth="1.2">{ticks(108, 60, 4, 15)}</g>

        {/* listening ping */}
        {state === "listening" && <circle className="ping" cx="200" cy="200" r="100" fill="none" stroke="var(--color-teal)" strokeWidth="2" />}

        {/* core */}
        <g className="core-pulse">
          <circle cx="200" cy="200" r="86" fill="url(#orb-core)" />
          <circle cx="200" cy="200" r="58" fill="none" stroke="#eaffff" strokeOpacity="0.35" strokeWidth="0.8" />
        </g>

        {/* acoustic waveform glyph / live waveform when listening */}
        <g transform="translate(200 200)" fill={state === "listening" ? "#050b17" : "#eaffff"} fillOpacity={state === "listening" ? 0.75 : 0.85}>
          {[-36, -24, -12, 0, 12, 24, 36].map((x, i) => {
            const h = [14, 26, 40, 54, 40, 26, 14][i];
            return (
              <rect key={x} x={x - 3} y={-h / 2} width="6" height={h} rx="3" className={state === "listening" || state === "speaking" ? "wave-bar" : undefined} style={{ animationDelay: `${i * 0.11}s`, transformOrigin: "center", transformBox: "fill-box" }} />
            );
          })}
        </g>
      </svg>
      {showLabel && (
        <span className="pointer-events-none absolute bottom-[6%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-bg/70 px-3 py-0.5 font-display text-[0.68rem] tracking-[0.25em] uppercase" style={{ color: accent }}>
          {STATE_LABEL[state]}
        </span>
      )}
    </div>
  );
}
