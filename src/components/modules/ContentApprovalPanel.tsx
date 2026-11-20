"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, Microscope, UserCheck, Send, RotateCcw, XCircle, ChevronRight, Plus, Lock } from "lucide-react";
import type { ApprovalRecord, ContentItem } from "@/types";
import { CONTENT_STAGES } from "@/types";
import type { Permission } from "@/lib/permissions";
import { Badge, Button, DemoBadge, EmptyState, cx } from "@/components/ui";

const STATUS_TONE = { DRAFT: "muted", FACT_CHECK: "royal", PNC_REVIEW: "violet", REVISION_REQUIRED: "amber", READY_FOR_APPROVAL: "cyan", APPROVED: "teal", PUBLISHED: "teal", REJECTED: "danger" } as const;
const label = (s: string) => s.replaceAll("_", " ").toLowerCase();

function RecordLine({ title, icon: Icon, rec }: { title: string; icon: typeof CheckCircle2; rec?: ApprovalRecord }) {
  const ok = rec && (rec.decision === "PASS" || rec.decision === "APPROVED");
  return (
    <div className={cx("flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs", ok ? "border-teal/40 bg-teal/5" : rec ? "border-danger/40 bg-danger/5" : "border-line")}>
      <Icon size={14} className={ok ? "text-teal" : rec ? "text-danger" : "text-muted"} />
      <div className="min-w-0">
        <p className="text-ink">{title}: <span className={ok ? "text-teal" : rec ? "text-danger" : "text-muted"}>{rec ? rec.decision : "pending"}</span></p>
        {rec && <p className="text-muted">{rec.reviewerName} · {new Date(rec.date).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}{rec.notes ? ` · “${rec.notes}”` : ""}</p>}
      </div>
    </div>
  );
}

export function ContentApprovalPanel({ initial, perms, userId }: { initial: ContentItem[]; perms: Permission[]; userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const has = (p: Permission) => perms.includes(p);

  async function act(item: ContentItem, action: Record<string, unknown>) {
    setBusy(item.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/content/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems((xs) => xs.map((x) => (x.id === item.id ? json.item : x)));
      setMsg({ id: item.id, text: json.summary, ok: true });
      router.refresh();
    } catch (e) {
      setMsg({ id: item.id, text: e instanceof Error ? e.message : "Action failed", ok: false });
    } finally {
      setBusy(null);
    }
  }

  const ask = (prompt: string, required: boolean) => {
    const v = window.prompt(prompt) ?? null;
    if (v === null) return null;
    if (required && !v.trim()) return null;
    return v.trim() || undefined;
  };

  async function create(form: HTMLFormElement) {
    const fd = new FormData(form);
    const res = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: fd.get("title"), hook: fd.get("hook"), language: fd.get("language") }) });
    const json = await res.json();
    if (res.ok) { setItems((xs) => [json.item, ...xs]); form.reset(); }
    else setMsg({ id: "new", text: json.error, ok: false });
  }

  const counts = CONTENT_STAGES.map((s) => items.filter((i) => i.stage === s).length);
  const shown = filter === "ALL" ? items : items.filter((i) => i.stage === filter);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1" aria-label="Content production pipeline">
          {CONTENT_STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <button type="button" onClick={() => setFilter(filter === s ? "ALL" : s)} aria-pressed={filter === s} className={cx("rounded-lg border px-2 py-1.5 text-left text-[0.65rem] uppercase tracking-wide", filter === s ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-muted hover:text-ink", ["SCIENTIFIC_FACT_CHECKING", "PNC_CONFIDENTIALITY_SCREENING", "HUMAN_APPROVAL"].includes(s) && "border-violet/50")}>
                <span className="tabular block text-sm text-ink">{counts[i]}</span>{label(s)}
              </button>
              {i < CONTENT_STAGES.length - 1 && <ChevronRight size={12} className="text-muted" aria-hidden />}
            </li>
          ))}
        </ol>
      </div>

      {has("content:edit") && (
        <form onSubmit={(e) => { e.preventDefault(); void create(e.currentTarget); }} className="grid gap-2 rounded-xl border border-line bg-bg/30 p-3 md:grid-cols-[1fr_1.4fr_auto_auto]">
          <label className="sr-only" htmlFor="c-title">Topic</label>
          <input id="c-title" name="title" required maxLength={160} placeholder="New content idea / topic" className="h-9 px-3 text-sm" />
          <label className="sr-only" htmlFor="c-hook">Hook</label>
          <input id="c-hook" name="hook" maxLength={300} placeholder="Hook (first 2 seconds)" className="h-9 px-3 text-sm" />
          <label className="sr-only" htmlFor="c-lang">Language</label>
          <select id="c-lang" name="language" defaultValue="BM" className="h-9 px-2 text-sm"><option value="BM">Bahasa Melayu</option><option value="EN">English</option></select>
          <Button type="submit" className="h-9"><Plus size={15} /> Add idea</Button>
        </form>
      )}
      {msg?.id === "new" && <p className="text-sm text-danger">{msg.text}</p>}

      {shown.length === 0 ? <EmptyState>No content in this stage.</EmptyState> : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {shown.map((c) => {
            const idx = CONTENT_STAGES.indexOf(c.stage);
            const mine = c.authorId === userId;
            const b = busy === c.id;
            return (
              <li key={c.id} className="holo-panel space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5"><Badge tone={STATUS_TONE[c.status]}>{label(c.status)}</Badge><Badge tone="muted">{c.language}</Badge>{c.isDemo && <DemoBadge />}</div>
                    <h3 className="mt-1 font-medium text-ink">{c.title}</h3>
                    {c.hook && <p className="text-sm text-muted">Hook: “{c.hook}”</p>}
                    <p className="text-xs text-muted">Author: {c.authorName}{mine && " (you)"}</p>
                  </div>
                </div>
                <div>
                  <div className="flex gap-0.5" aria-label={`Stage ${idx + 1} of ${CONTENT_STAGES.length}: ${label(c.stage)}`}>
                    {CONTENT_STAGES.map((s, i) => <span key={s} title={label(s)} className={cx("h-1.5 flex-1 rounded-full", i < idx ? "bg-teal" : i === idx ? "bg-cyan shadow-[0_0_6px_var(--color-cyan)]" : "bg-white/10")} />)}
                  </div>
                  <p className="mt-1 text-xs text-cyan">{label(c.stage)}</p>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  <RecordLine title="Fact-check" icon={Microscope} rec={c.factCheck} />
                  <RecordLine title="PNC screening" icon={ShieldCheck} rec={c.pncScreening} />
                  <RecordLine title="Human approval" icon={UserCheck} rec={c.approval} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  <span>ElevenLabs narration: <span className="text-ink">{label(c.narrationStatus)}</span></span>
                  <span>· Canva edit: <span className="text-ink">{label(c.canvaStatus)}</span></span>
                  {c.scheduledFor && <span>· Scheduled {c.scheduledFor}</span>}
                </div>
                {c.storyboard.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-cyan">Storyboard · {c.storyboard.length} scene{c.storyboard.length > 1 ? "s" : ""}</summary>
                    <ol className="mt-1 space-y-1">{c.storyboard.map((s) => <li key={s.scene} className="rounded bg-bg/40 px-2 py-1 text-xs"><span className="text-cyan">Scene {s.scene}:</span> <span className="text-ink">{s.visual}</span><br /><span className="text-muted">VO: {s.narration}</span></li>)}</ol>
                  </details>
                )}
                {c.status === "PUBLISHED" && (
                  <div className="rounded-md border border-line p-2 text-xs">
                    <p className="text-ink">Published: <a className="text-cyan underline" href={c.publishedUrl} target="_blank" rel="noopener noreferrer">{c.publishedUrl}</a></p>
                    <p className="text-muted">Performance analytics: {c.analytics ? `${c.analytics.views} views · ${c.analytics.leads} leads · affiliate ${c.analytics.affiliateIncome ?? "not recorded"}` : "not yet recorded (TikTok analytics integration not connected)"}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {has("content:edit") && ["DRAFT", "REVISION_REQUIRED"].includes(c.status) && !(c.status === "DRAFT" && c.pncScreening?.decision === "PASS") && (
                    <Button disabled={b} onClick={() => act(c, { action: "SUBMIT_FOR_FACT_CHECK" })}><Send size={14} /> Submit for fact-check</Button>
                  )}
                  {has("content:fact_check") && c.status === "FACT_CHECK" && (
                    mine ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Lock size={12} /> Another reviewer must fact-check your content</span> : <>
                      <Button disabled={b} onClick={() => act(c, { action: "RECORD_FACT_CHECK", decision: "PASS", notes: ask("Fact-check notes (optional):", false) })}><Microscope size={14} /> Pass fact-check</Button>
                      <Button variant="danger" disabled={b} onClick={() => { const n = ask("What claim failed verification?", true); if (n) void act(c, { action: "RECORD_FACT_CHECK", decision: "FAIL", notes: n }); }}>Fail</Button>
                    </>
                  )}
                  {has("content:pnc_review") && c.status === "PNC_REVIEW" && (
                    mine ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Lock size={12} /> Another reviewer must PNC-screen your content</span> : <>
                      <Button disabled={b} onClick={() => act(c, { action: "RECORD_PNC_SCREENING", decision: "PASS", notes: ask("PNC screening notes (optional):", false) })}><ShieldCheck size={14} /> Pass PNC screening</Button>
                      <Button variant="danger" disabled={b} onClick={() => { const n = ask("What proprietary content must be removed?", true); if (n) void act(c, { action: "RECORD_PNC_SCREENING", decision: "FAIL", notes: n }); }}>Fail</Button>
                    </>
                  )}
                  {has("content:edit") && c.status === "DRAFT" && c.pncScreening?.decision === "PASS" && (
                    <Button disabled={b} onClick={() => act(c, { action: "ADVANCE_STAGE" })}><ChevronRight size={14} /> {c.stage === "FINAL_REVIEW" ? "Submit for human approval" : "Advance stage"}</Button>
                  )}
                  {has("content:approve") && c.status === "READY_FOR_APPROVAL" && (
                    mine ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Lock size={12} /> You cannot approve your own content</span> :
                    <Button disabled={b} onClick={() => act(c, { action: "APPROVE", notes: ask("Approval notes (optional):", false) })}><UserCheck size={14} /> Approve</Button>
                  )}
                  {has("content:publish") && c.status === "APPROVED" && (
                    <Button disabled={b} onClick={() => { const url = ask("Automatic TikTok posting is NOT connected. After posting manually, paste the TikTok post URL (https://…):", true); if (url) void act(c, { action: "RECORD_PUBLISHED", url }); }}><CheckCircle2 size={14} /> Record manual publication</Button>
                  )}
                  {((c.status === "FACT_CHECK" && has("content:fact_check") && !mine) || (c.status === "PNC_REVIEW" && has("content:pnc_review") && !mine) || (["READY_FOR_APPROVAL", "APPROVED"].includes(c.status) && has("content:approve"))) && (
                    <Button variant="ghost" disabled={b} onClick={() => { const n = ask("What needs to change?", true); if (n) void act(c, { action: "REQUEST_REVISION", notes: n }); }}><RotateCcw size={14} /> Request revision</Button>
                  )}
                  {has("content:approve") && !["PUBLISHED", "REJECTED"].includes(c.status) && (
                    <Button variant="ghost" disabled={b} onClick={() => { const n = ask("Reason for rejection:", true); if (n) void act(c, { action: "REJECT", notes: n }); }}><XCircle size={14} /> Reject</Button>
                  )}
                </div>
                {msg?.id === c.id && <p role="status" className={cx("text-sm", msg.ok ? "text-teal" : "text-danger")}>{msg.text}</p>}
                {c.history.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted">Decision log ({c.history.length})</summary>
                    <ul className="mt-1 space-y-0.5 text-muted">{c.history.map((h) => <li key={h.id}>{new Date(h.date).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {label(h.action)} · {h.decision} · {h.reviewerName}{h.notes ? ` — ${h.notes}` : ""}</li>)}</ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
