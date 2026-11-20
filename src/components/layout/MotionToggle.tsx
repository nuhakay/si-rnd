"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

/** Low-animation mode for Smart TVs and low-power devices. Stored per browser. */
export function MotionToggle({ className = "" }: { className?: string }) {
  const [low, setLow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read DOM attribute set by the boot script
    setLow(document.documentElement.dataset.motion === "low");
  }, []);
  const toggle = () => {
    const next = !low;
    setLow(next);
    document.documentElement.dataset.motion = next ? "low" : "full";
    try { localStorage.setItem("sia-motion", next ? "low" : "full"); } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={low} className={`inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-ink ${className}`} title="Reduce animations">
      <Gauge size={14} /> {low ? "Low motion" : "Full motion"}
    </button>
  );
}
