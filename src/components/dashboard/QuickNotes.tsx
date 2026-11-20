"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { QuickNote } from "@/types";

export function QuickNotes({ initial }: { initial: QuickNote[] }) {
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setNotes((n) => [json.note, ...n]);
    setText("");
  }
  async function remove(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((n) => n.filter((x) => x.id !== id));
  }
  return (
    <div className="space-y-2">
      <form onSubmit={add} className="flex gap-2">
        <label className="sr-only" htmlFor="quick-note">Quick note</label>
        <input id="quick-note" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Jot a quick note…" className="h-9 min-w-0 flex-1 px-3 text-sm" />
        <button type="submit" className="rounded-lg border border-cyan/50 px-3 text-sm text-cyan">Save</button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
      <ul className="space-y-1.5">
        {notes.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-2 rounded-md bg-bg/40 px-2 py-1.5 text-sm">
            <span className="whitespace-pre-wrap break-words text-ink">{n.text}</span>
            <button type="button" onClick={() => remove(n.id)} aria-label="Delete note" className="shrink-0 text-muted hover:text-danger"><X size={14} /></button>
          </li>
        ))}
        {notes.length === 0 && <li className="text-xs text-muted">Notes are private to you.</li>}
      </ul>
    </div>
  );
}
