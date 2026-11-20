"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export function ReportDraft({ autoload }: { autoload: boolean }) {
  const [md, setMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(autoload);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMd(json.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build report");
    } finally {
      setBusy(false);
    }
  }, []);
  // Auto-build once when opened from AURA (“Prepare a draft weekly report”).
  useEffect(() => {
    if (!autoload) return;
    let cancelled = false;
    fetch("/api/reports/weekly")
      .then(async (res) => ({ ok: res.ok, json: await res.json() }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (ok) setMd(json.markdown);
        else setError(json.error);
      })
      .catch(() => !cancelled && setError("Failed to build report"))
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
  }, [autoload]);

  const download = () => {
    if (!md) return;
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRAFT-rnd-weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={busy}><RefreshCw size={14} /> {md ? "Rebuild draft" : "Generate weekly draft"}</Button>
        {md && <Button variant="ghost" onClick={async () => { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</Button>}
        {md && <Button variant="ghost" onClick={download}><Download size={14} /> Download .md</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {md && <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg/60 p-4 text-sm leading-relaxed text-ink">{md}</pre>}
      {!md && !busy && <p className="text-sm text-muted">Builds a DRAFT from current project, task and deadline data you are cleared to see. Nothing is sent or approved automatically.</p>}
    </div>
  );
}
