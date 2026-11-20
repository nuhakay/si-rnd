"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ResearchDocument } from "@/types";
import { Badge, ClassificationBadge, DemoBadge, EmptyState } from "@/components/ui";

const KINDS: { key: ResearchDocument["kind"] | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "LITERATURE", label: "Literature register" },
  { key: "PAPER_SUMMARY", label: "Paper summaries" },
  { key: "STANDARD", label: "Standards register" },
  { key: "TEST_SCHEDULE", label: "Lab test schedule" },
  { key: "REPORT", label: "Reports" },
];

export function ResearchLibrary({ documents, projects, hiddenCount }: { documents: ResearchDocument[]; projects: { id: string; code: string }[]; hiddenCount: number }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("ALL");
  const [cls, setCls] = useState("ALL");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return documents.filter((d) =>
      (kind === "ALL" || d.kind === kind) &&
      (cls === "ALL" || d.classification === cls) &&
      (!approvedOnly || d.status === "APPROVED") &&
      (!term || [d.title, d.summary, d.authors, ...d.tags].some((s) => s.toLowerCase().includes(term))),
    );
  }, [documents, q, kind, cls, approvedOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="r-search" className="sr-only">Search research</label>
          <input id="r-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, tags, authors…" className="h-9 w-full pl-9 pr-3 text-sm" />
        </div>
        <label className="sr-only" htmlFor="r-cls">Classification</label>
        <select id="r-cls" value={cls} onChange={(e) => setCls(e.target.value)} className="h-9 px-2 text-sm">
          {["ALL", "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"].map((c) => <option key={c} value={c}>{c === "ALL" ? "All classifications" : c}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={approvedOnly} onChange={(e) => setApprovedOnly(e.target.checked)} /> Approved only</label>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Document type">
        {KINDS.map((k) => (
          <button key={k.key} role="tab" aria-selected={kind === k.key} onClick={() => setKind(k.key)} className={`rounded-full border px-2.5 py-1 text-xs ${kind === k.key ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-muted hover:text-ink"}`}>{k.label}</button>
        ))}
      </div>
      {hiddenCount > 0 && <p className="text-xs text-amber">{hiddenCount} document{hiddenCount > 1 ? "s" : ""} above your clearance are not shown.</p>}
      {filtered.length === 0 ? <EmptyState>No documents match.</EmptyState> : (
        <ul className="space-y-2">
          {filtered.map((d) => (
            <li key={d.id} className="rounded-lg border border-line bg-bg/40">
              <button className="flex w-full flex-wrap items-start justify-between gap-2 px-3 py-2 text-left" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{d.title}</span>
                  <span className="text-xs text-muted">{d.kind.replace("_", " ").toLowerCase()} · {d.authors} · {d.date}{d.projectId && ` · ${projects.find((p) => p.id === d.projectId)?.code ?? ""}`}</span>
                </span>
                <span className="flex flex-wrap gap-1"><ClassificationBadge value={d.classification} /><Badge tone={d.status === "APPROVED" ? "teal" : d.status === "UNDER_REVIEW" ? "amber" : "muted"}>{d.status.replace("_", " ")}</Badge>{d.isDemo && <DemoBadge />}</span>
              </button>
              {open === d.id && (
                <div className="border-t border-line px-3 py-2 text-sm">
                  <p className="text-ink">{d.summary}</p>
                  <p className="mt-1 text-xs text-muted">Tags: {d.tags.join(", ")}</p>
                  <p className="hud-label mt-2">Version history</p>
                  <ul className="text-xs text-muted">{d.versions.map((v) => <li key={v.version}>v{v.version} · {v.date} · {v.note} · {v.by}</li>)}</ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
