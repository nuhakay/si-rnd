"use client";

import { useEffect, useState } from "react";
import { TIMEZONE } from "@/lib/time";

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("en-MY", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Malaysia-time digital clock. Ticks once per second (cheap text update, no animation loop). */
export function LiveClock({ size = "md", showSeconds = true }: { size?: "sm" | "md" | "xl"; showSeconds?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, showSeconds ? 1000 : 15_000);
    return () => clearInterval(id);
  }, [showSeconds]);
  const t = now ? timeFmt.format(now) : "--:--:--";
  const time = showSeconds ? t : t.slice(0, 5);
  const cls = { sm: "text-base", md: "text-3xl", xl: "text-[clamp(2.5rem,9vh,9rem)]" }[size];
  return (
    <div className="leading-none" suppressHydrationWarning>
      <time className={`tabular glow-text block font-medium text-ink ${cls}`} dateTime={now?.toISOString()}>{time}</time>
      {size !== "sm" && (
        <span className={`mt-1 block text-muted ${size === "xl" ? "text-[clamp(0.9rem,2.2vh,2.2rem)]" : "text-xs"}`}>
          {now ? dateFmt.format(now) : " "} · MYT (UTC+8)
        </span>
      )}
    </div>
  );
}
