import type { ReactNode } from "react";
import { ProgressRing } from "@/components/charts/ProgressRing";

export function KPIWidget({ label, value, hint, ring, tone = "var(--color-cyan)", icon }: { label: string; value: ReactNode; hint?: string; ring?: number; tone?: string; icon?: ReactNode }) {
  return (
    <div className="holo-panel flex items-center gap-3 p-3">
      {ring !== undefined ? <ProgressRing value={ring} size={56} stroke={5} color={tone} label={label} /> : icon && <div className="grid h-12 w-12 place-items-center rounded-full border border-line" style={{ color: tone }}>{icon}</div>}
      <div className="min-w-0">
        <p className="hud-label truncate">{label}</p>
        <p className="tabular text-2xl leading-tight text-ink">{value}</p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
