"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Minimize, RefreshCw, WifiOff } from "lucide-react";
import type { TvSnapshot } from "@/lib/data/repo";
import { AIOrb } from "@/components/ai/AIOrb";
import { LiveClock } from "@/components/layout/LiveClock";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { formatKlDate, formatKlTime, klDateString } from "@/lib/time";

const REFRESH_MS = 60_000;
const HEALTH = { GREEN: "var(--color-teal)", AMBER: "var(--color-amber)", RED: "var(--color-danger)" } as const;

/**
 * Smart TV display (1920×1080 and 4K). Receives only the sanitised TV snapshot.
 * Refreshes every 60 s; keeps showing the last good data if the network drops.
 */
export function TVDashboard({ initial }: { initial: TvSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [fs, setFs] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch("/api/tv", { cache: "no-store" });
        if (res.status === 401) { router.push("/login?next=/tv"); return; }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TvSnapshot;
        if (!stop) { setSnap(data); setOffline(false); }
      } catch {
        if (!stop) setOffline(true);
      }
    };
    const id = setInterval(load, REFRESH_MS);
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => { stop = true; clearInterval(id); document.removeEventListener("fullscreenchange", onFs); };
  }, [router]);

  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* some TV browsers block fullscreen */ }
  };

  const today = klDateString();
  const big = "text-[clamp(1rem,1.25vw,2.4rem)]";
  const label = "hud-label !text-[clamp(0.7rem,0.8vw,1.4rem)]";

  return (
    <div className="grid h-dvh grid-cols-[1fr_1.1fr_1fr] grid-rows-[auto_1fr_auto] gap-[1.2vw] overflow-hidden p-[1.5vw]">
      <header className="col-span-3 flex items-center justify-between">
        <div>
          <p className="font-display text-[clamp(1rem,1.4vw,2.6rem)] font-bold tracking-[0.25em] text-cyan glow-text">SI ACOUSTIC</p>
          <p className={label}>R&amp;D Command Centre · Office display</p>
        </div>
        <div className="flex items-center gap-3">
          {snap.isDemo && <span className="rounded-md border border-violet/50 px-2 py-1 text-[clamp(0.7rem,0.8vw,1.3rem)] text-[#cfc2ff]">DEMO DATA</span>}
          {offline && <span className="inline-flex items-center gap-1 text-amber"><WifiOff size={18} /> Offline — showing last update</span>}
          <span className="inline-flex items-center gap-1 text-[clamp(0.7rem,0.8vw,1.3rem)] text-muted"><RefreshCw size={14} /> {formatKlTime(snap.generatedAt)}</span>
          <button onClick={toggleFs} className="rounded-md border border-line p-2 text-muted hover:text-cyan" aria-label={fs ? "Exit fullscreen" : "Enter fullscreen"}>{fs ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        </div>
      </header>

      <section className="holo-panel flex min-h-0 flex-col gap-[1vw] overflow-hidden p-[1.2vw]">
        <h2 className={label}>Project overview</h2>
        <ul className="flex min-h-0 flex-1 flex-col justify-around gap-[0.8vw]">
          {snap.projects.map((p) => (
            <li key={p.code}>
              <div className={`flex items-baseline justify-between gap-2 ${big}`}>
                <span className="min-w-0 truncate text-ink"><span className="tabular mr-2 text-cyan">{p.code}</span>{p.title}</span>
                <span className="tabular text-ink">{p.progress}%</span>
              </div>
              <div className="mt-1 h-[0.6vw] min-h-1.5 overflow-hidden rounded-full bg-bg/70">
                <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: HEALTH[p.health], boxShadow: `0 0 10px ${HEALTH[p.health]}` }} />
              </div>
              <p className="mt-0.5 text-[clamp(0.7rem,0.85vw,1.5rem)] text-muted">{p.stage.toLowerCase()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex min-h-0 flex-col items-center justify-between gap-[1.5vh] overflow-hidden text-center">
        <AIOrb size="min(26vw, 38vh)" />
        <LiveClock size="xl" showSeconds={false} />
        <div className="holo-panel w-full p-[1vw] text-left">
          <h2 className={label}>Today&apos;s priorities</h2>
          <ol className="mt-1 space-y-1">
            {snap.priorities.length ? snap.priorities.map((t, i) => <li key={i} className={`${big} truncate text-ink`}><span className="tabular mr-2 text-cyan">0{i + 1}</span>{t.title}</li>) : <li className={`${big} text-muted`}>No priorities due today.</li>}
          </ol>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-[1.2vw] overflow-hidden">
        <div className="holo-panel min-h-0 flex-1 overflow-hidden p-[1.2vw]">
          <h2 className={label}>Upcoming milestones</h2>
          <ul className="mt-2 space-y-[0.6vw]">
            {snap.milestones.map((m, i) => (
              <li key={i} className={`flex justify-between gap-3 ${big}`}>
                <span className="min-w-0 truncate text-ink"><span className="tabular mr-2 text-cyan">{m.code}</span>{m.title}</span>
                <span className="tabular shrink-0 text-muted">{m.dueDate === today ? "Today" : formatKlDate(m.dueDate, { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="holo-panel min-h-0 flex-1 overflow-hidden p-[1.2vw]">
          <h2 className={label}>Calendar</h2>
          <ul className="mt-2 space-y-[0.6vw]">
            {snap.events.map((e, i) => (
              <li key={i} className={`flex justify-between gap-3 ${big}`}>
                <span className="min-w-0 truncate text-ink">{e.title}</span>
                <span className="tabular shrink-0 text-muted">{e.start.slice(0, 10) === today ? formatKlTime(e.start) : formatKlDate(e.start, { weekday: "short", day: "numeric" })}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="col-span-3">
        <h2 className={`${label} mb-1`}>System notifications</h2>
        <NotificationPanel notifications={snap.notifications.slice(0, 3)} large horizontal />
      </footer>
    </div>
  );
}
