"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, MicOff, Send, Volume2, VolumeX, ArrowUpRight, Square } from "lucide-react";
import { AIOrb, type OrbState } from "./AIOrb";
import { Badge, cx } from "@/components/ui";
import type { AssistantReply, AssistantSource } from "@/lib/assistant/engine";

// Minimal typings for the Web Speech API (not in TS DOM lib everywhere)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognitionLike;

const SOURCE: Record<AssistantSource, { label: string; tone: "teal" | "royal" | "violet" | "muted" }> = {
  LOCAL_COMMAND: { label: "Local command", tone: "teal" },
  DATABASE_QUERY: { label: "Live data query", tone: "royal" },
  EXTERNAL_AI: { label: "External AI model", tone: "violet" },
  UNRECOGNISED: { label: "Not recognised", tone: "muted" },
};

const QUICK = ["What are my priorities today?", "What is the next R&D deadline?", "Show projects requiring attention", "Prepare a draft weekly report"];

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone permission was denied. Allow the microphone for this site in your browser settings, or type instead.",
  "service-not-allowed": "Speech recognition is blocked on this browser. Please type your command.",
  "no-speech": "I didn't hear anything. Tap the mic and speak, or type instead.",
  "audio-capture": "No microphone was found. Please type your command.",
  network: "Speech recognition needs a network connection on this browser. Please type instead.",
  aborted: "",
};

export interface HistoryEntry { id: number; q: string; reply: AssistantReply; at: string }

export function VoiceCommandPanel({ variant = "full", orbSize = 300 }: { variant?: "full" | "compact" | "orb"; orbSize?: number | string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [orb, setOrb] = useState<OrbState>("idle");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [speak, setSpeak] = useState(false);
  const [lang, setLang] = useState<"en-MY" | "ms-MY">("en-MY");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run client-side after mount
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    try {
      setSpeak(localStorage.getItem("sia-tts") === "1");
    } catch { /* storage unavailable */ }
    return () => recRef.current?.abort();
  }, []);

  const say = useCallback((text: string) => {
    if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.02;
    u.onend = () => setOrb("idle");
    setOrb("speaking");
    window.speechSynthesis.speak(u);
  }, [speak, lang]);

  const send = useCallback(async (raw: string) => {
    const message = raw.trim();
    if (!message) return;
    setInput("");
    setInterim("");
    setNotice(null);
    setOrb("thinking");
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (res.status === 401) { router.push("/login"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      const reply = json.reply as AssistantReply;
      setHistory((h) => [{ id: ++idRef.current, q: message, reply, at: new Date().toISOString() }, ...h].slice(0, 30));
      setOrb("idle");
      say(reply.text);
      if (reply.navigate && (reply.intent.startsWith("open_") || reply.intent === "weekly_report")) {
        setTimeout(() => router.push(reply.navigate!), variant === "full" ? 900 : 600);
      }
    } catch (e) {
      setOrb("error");
      setNotice(e instanceof Error ? `AURA could not reach the server: ${e.message}` : "AURA could not reach the server.");
      setTimeout(() => setOrb("idle"), 2500);
    }
  }, [router, say, variant]);

  const toggleMic = useCallback(() => {
    if (orb === "listening") { recRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setNotice("Voice input isn't supported on this browser. Type your command below."); return; }
    try {
      window.speechSynthesis?.cancel();
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false; // push-to-talk only — never always-on
      rec.maxAlternatives = 1;
      let finalText = "";
      rec.onresult = (e) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else text += r[0].transcript;
        }
        setInterim(finalText || text);
      };
      rec.onerror = (e) => {
        const msg = MIC_ERRORS[e.error] ?? `Voice input error (${e.error}). Please type instead.`;
        if (msg) setNotice(msg);
        setOrb("idle");
      };
      rec.onend = () => {
        recRef.current = null;
        setOrb((s) => (s === "listening" ? "idle" : s));
        if (finalText.trim()) void send(finalText);
      };
      recRef.current = rec;
      setNotice(null);
      setOrb("listening");
      rec.start();
    } catch {
      setOrb("idle");
      setNotice("Couldn't start the microphone. Please type your command.");
    }
  }, [orb, lang, send]);

  const toggleSpeak = () => {
    setSpeak((s) => {
      const next = !s;
      try { localStorage.setItem("sia-tts", next ? "1" : "0"); } catch { /* ignore */ }
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  };

  const latest = history[0];
  const listening = orb === "listening";

  const controls = (
    <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
      <button
        type="button"
        onClick={toggleMic}
        disabled={supported === false}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Speak to AURA"}
        title={supported === false ? "Voice input not supported in this browser" : listening ? "Stop" : "Push to talk"}
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors",
          listening ? "border-teal bg-teal/20 text-teal shadow-[0_0_18px_var(--color-teal)]" : "border-cyan/50 bg-cyan/10 text-cyan hover:bg-cyan/20",
          supported === false && "opacity-40",
        )}
      >
        {supported === false ? <MicOff size={18} /> : listening ? <Square size={16} /> : <Mic size={18} />}
      </button>
      <label className="sr-only" htmlFor={`aura-input-${variant}`}>Command for AURA</label>
      <input
        id={`aura-input-${variant}`}
        value={listening ? interim : input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={listening ? "Listening…" : "Ask AURA — e.g. “What are my priorities today?”"}
        maxLength={500}
        autoComplete="off"
        className="h-11 min-w-0 flex-1 px-3 text-sm"
        readOnly={listening}
      />
      <button type="submit" aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan/50 bg-cyan/10 text-cyan hover:bg-cyan/20 disabled:opacity-40" disabled={!input.trim() || listening}>
        <Send size={17} />
      </button>
    </form>
  );

  const replyView = (entry: HistoryEntry, big = false) => (
    <div key={entry.id} className="fade-up rounded-xl border border-line bg-bg/50 p-3" aria-live="polite">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="truncate">“{entry.q}”</span>
        <Badge tone={SOURCE[entry.reply.source].tone}>{SOURCE[entry.reply.source].label}</Badge>
      </div>
      <p className={cx("text-ink", big ? "text-base" : "text-sm")}>{entry.reply.text}</p>
      {entry.reply.items && entry.reply.items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.reply.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-md bg-panel/60 px-2 py-1.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">{it.label}</span>
                {it.detail && <span className="text-xs text-muted">{it.detail}</span>}
              </span>
              {it.href && <Link href={it.href} className="shrink-0 text-cyan" aria-label={`Open ${it.label}`}><ArrowUpRight size={16} /></Link>}
              {!it.href && entry.reply.intent === "help" && (
                <button type="button" className="shrink-0 text-xs text-cyan" onClick={() => void send(it.label)}>Run</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {entry.reply.navigate && !entry.reply.intent.startsWith("open_") && (
        <Link href={entry.reply.navigate} className="mt-2 inline-flex items-center gap-1 text-xs text-cyan">Open <ArrowUpRight size={13} /></Link>
      )}
    </div>
  );

  const toolbar = (
    <div className="flex items-center gap-2 text-xs text-muted">
      <button type="button" onClick={toggleSpeak} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 hover:text-ink" aria-pressed={speak}>
        {speak ? <Volume2 size={14} /> : <VolumeX size={14} />} {speak ? "Voice on" : "Voice off"}
      </button>
      <select aria-label="Recognition language" value={lang} onChange={(e) => setLang(e.target.value as "en-MY" | "ms-MY")} className="h-7 px-1 text-xs">
        <option value="en-MY">English</option>
        <option value="ms-MY">Bahasa Melayu</option>
      </select>
      {supported === false && <span>Voice input unsupported — text mode</span>}
    </div>
  );

  if (variant === "orb") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <button type="button" onClick={toggleMic} className="rounded-full" aria-label="Tap the AURA core to talk" disabled={supported === false}>
          <AIOrb state={orb} size={orbSize} />
        </button>
        <div className="w-full max-w-xl space-y-2">
          {controls}
          <div className="flex flex-wrap justify-center gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => void send(q)} className="rounded-full border border-line bg-panel/50 px-2.5 py-1 text-xs text-muted hover:border-cyan/50 hover:text-cyan">{q}</button>
            ))}
          </div>
          {notice && <p role="alert" className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">{notice}</p>}
          {latest && replyView(latest)}
          <div className="flex justify-center">{toolbar}</div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleMic} disabled={supported === false} aria-label="Talk to AURA" className="shrink-0"><AIOrb state={orb} size={84} showLabel={false} /></button>
          <div className="min-w-0">
            <p className="font-display text-lg text-ink">AURA</p>
            <p className="text-xs text-muted">{listening ? "Listening…" : "Tap the core or type a command"}</p>
          </div>
        </div>
        {controls}
        {notice && <p role="alert" className="text-xs text-amber">{notice}</p>}
        {latest && replyView(latest)}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col items-center gap-4">
        <button type="button" onClick={toggleMic} className="rounded-full" aria-label="Tap the AURA core to talk" disabled={supported === false}>
          <AIOrb state={orb} size={orbSize} />
        </button>
        {toolbar}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {controls}
        <div className="flex flex-wrap gap-1.5">
          {["Good morning, AURA", ...QUICK, "Show Chameleon project progress", "What is our department mission?", "Open my research library", "Open the AI Content Factory", "help"].map((q) => (
            <button key={q} type="button" onClick={() => void send(q)} className="rounded-full border border-line bg-panel/50 px-2.5 py-1 text-xs text-muted hover:border-cyan/50 hover:text-cyan">{q}</button>
          ))}
        </div>
        {notice && <p role="alert" className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">{notice}</p>}
        <div className="space-y-2">
          <p className="hud-label">Command history (this session)</p>
          {history.length === 0 ? <p className="text-sm text-muted">No commands yet.</p> : history.map((h, i) => replyView(h, i === 0))}
        </div>
      </div>
    </div>
  );
}
