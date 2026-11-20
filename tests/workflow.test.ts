import { describe, it, expect } from "vitest";
import { applyContentAction, isPublishable } from "@/lib/content/workflow";
import type { ContentItem, PublicUser } from "@/types";

const author: PublicUser = { id: "a", username: "engineer", displayName: "Eng", role: "R&D_ENGINEER" };
const engineer2: PublicUser = { id: "e2", username: "eng2", displayName: "Eng 2", role: "R&D_ENGINEER" };
const manager: PublicUser = { id: "m", username: "manager", displayName: "Mgr", role: "R&D_MANAGER" };
const viewer: PublicUser = { id: "v", username: "viewer", displayName: "View", role: "MANAGEMENT_VIEWER" };
const tv: PublicUser = { id: "t", username: "tv", displayName: "TV", role: "TV_VIEWER" };

const fresh = (): ContentItem => ({
  id: "c1", title: "t", hook: "h", language: "BM", stage: "TOPIC_RESEARCH", status: "DRAFT", authorId: author.id, authorName: author.displayName,
  storyboard: [], narrationStatus: "NOT_STARTED", canvaStatus: "NOT_STARTED", history: [], isDemo: false,
});

function step(item: ContentItem, action: Parameters<typeof applyContentAction>[1], actor: PublicUser) {
  const r = applyContentAction(item, action, actor);
  if (!r.ok) throw new Error(r.error);
  return r.item;
}

function toApproval() {
  let c = step(fresh(), { action: "SUBMIT_FOR_FACT_CHECK" }, author);
  c = step(c, { action: "RECORD_FACT_CHECK", decision: "PASS" }, engineer2);
  c = step(c, { action: "RECORD_PNC_SCREENING", decision: "PASS" }, manager);
  for (let i = 0; i < 5; i++) c = step(c, { action: "ADVANCE_STAGE" }, author);
  return c;
}

describe("content approval workflow", () => {
  it("runs the full happy path with reviewer + date records", () => {
    let c = toApproval();
    expect(c.status).toBe("READY_FOR_APPROVAL");
    expect(c.stage).toBe("HUMAN_APPROVAL");
    c = step(c, { action: "APPROVE" }, manager);
    expect(c.status).toBe("APPROVED");
    expect(isPublishable(c)).toBe(true);
    c = step(c, { action: "RECORD_PUBLISHED", url: "https://www.tiktok.com/@x/video/1" }, manager);
    expect(c.status).toBe("PUBLISHED");
    expect(c.factCheck?.reviewerId).toBe(engineer2.id);
    expect(c.pncScreening?.reviewerId).toBe(manager.id);
    expect(c.approval?.reviewerName).toBe("Mgr");
    expect(c.approval?.date).toMatch(/^\d{4}-/);
  });

  it("blocks publishing without approval, PNC and fact-check", () => {
    const draft = fresh();
    const r = applyContentAction(draft, { action: "RECORD_PUBLISHED", url: "https://x.com/1" }, manager);
    expect(r.ok).toBe(false);
    const ready = toApproval();
    const r2 = applyContentAction(ready, { action: "RECORD_PUBLISHED", url: "https://x.com/1" }, manager);
    expect(r2.ok).toBe(false);
    // forged status without records is still blocked
    const forged = { ...fresh(), status: "APPROVED" as const };
    expect(applyContentAction(forged, { action: "RECORD_PUBLISHED", url: "https://x.com/1" }, manager).ok).toBe(false);
  });

  it("enforces separation of duties", () => {
    let c = step(fresh(), { action: "SUBMIT_FOR_FACT_CHECK" }, author);
    const self = applyContentAction(c, { action: "RECORD_FACT_CHECK", decision: "PASS" }, author);
    expect(self.ok).toBe(false);
    c = step(c, { action: "RECORD_FACT_CHECK", decision: "PASS" }, engineer2);
    const managerAuthored = { ...c, authorId: manager.id };
    expect(applyContentAction(managerAuthored, { action: "RECORD_PNC_SCREENING", decision: "PASS" }, manager).ok).toBe(false);
  });

  it("enforces role permissions per action", () => {
    let c = step(fresh(), { action: "SUBMIT_FOR_FACT_CHECK" }, author);
    c = step(c, { action: "RECORD_FACT_CHECK", decision: "PASS" }, engineer2);
    const r = applyContentAction(c, { action: "RECORD_PNC_SCREENING", decision: "PASS" }, engineer2);
    expect(r.ok === false && r.status).toBe(403);
    const ready = toApproval();
    expect(applyContentAction(ready, { action: "APPROVE" }, engineer2).ok).toBe(false);
    expect(applyContentAction(ready, { action: "APPROVE" }, viewer).ok).toBe(false);
    expect(applyContentAction(ready, { action: "APPROVE" }, tv).ok).toBe(false);
  });

  it("cannot advance production before checks pass", () => {
    const r = applyContentAction(fresh(), { action: "ADVANCE_STAGE" }, author);
    expect(r.ok).toBe(false);
  });

  it("failed fact-check sends item back for revision, and resubmission clears old records", () => {
    let c = step(fresh(), { action: "SUBMIT_FOR_FACT_CHECK" }, author);
    c = step(c, { action: "RECORD_FACT_CHECK", decision: "FAIL", notes: "claim unsupported" }, engineer2);
    expect(c.status).toBe("REVISION_REQUIRED");
    c = step(c, { action: "SUBMIT_FOR_FACT_CHECK" }, author);
    expect(c.factCheck).toBeUndefined();
    expect(c.history.length).toBe(3);
  });

  it("revision after approval revokes the approval", () => {
    let c = step(toApproval(), { action: "APPROVE" }, manager);
    c = step(c, { action: "REQUEST_REVISION", notes: "fix caption" }, manager);
    expect(c.approval).toBeUndefined();
    expect(isPublishable(c)).toBe(false);
  });

  it("does not mutate its input", () => {
    const original = fresh();
    applyContentAction(original, { action: "SUBMIT_FOR_FACT_CHECK" }, author);
    expect(original.status).toBe("DRAFT");
  });
});
