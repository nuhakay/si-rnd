import { randomUUID } from "node:crypto";
import type { ApprovalRecord, ContentItem, ContentStage, PublicUser } from "@/types";
import { CONTENT_STAGES } from "@/types";
import { can, type Permission } from "@/lib/permissions";
import type { ContentAction } from "@/lib/validation";

/**
 * AI Content Factory approval workflow (pure, unit-tested).
 *
 *  TOPIC_RESEARCH ──submit──▶ SCIENTIFIC_FACT_CHECKING [FACT_CHECK]
 *    ──fact-check PASS──▶ PNC_CONFIDENTIALITY_SCREENING [PNC_REVIEW]
 *    ──PNC PASS──▶ SCRIPT → STORYBOARD → VOICE_OVER → VIDEO_PRODUCTION → FINAL_REVIEW [DRAFT, cleared]
 *    ──advance──▶ HUMAN_APPROVAL [READY_FOR_APPROVAL]
 *    ──approve──▶ TIKTOK_PUBLISHING [APPROVED]
 *    ──record manual publication──▶ PERFORMANCE_ANALYTICS [PUBLISHED]
 *
 * Hard rules:
 *  - Nothing reaches PUBLISHED without a PASS fact-check, a PASS PNC screening
 *    and an APPROVED human decision, each with reviewer + date.
 *  - Reviewers and approvers cannot be the author (separation of duties).
 *  - Automatic TikTok posting is NOT implemented; publication is recorded
 *    manually (with the post URL) after a human has posted it.
 */
export type WorkflowResult = { ok: true; item: ContentItem; summary: string } | { ok: false; status: 403 | 409; error: string };

const PRODUCTION: ContentStage[] = ["SCRIPT", "STORYBOARD", "VOICE_OVER", "VIDEO_PRODUCTION", "FINAL_REVIEW"];

export function requiredPermission(action: ContentAction["action"], item: ContentItem): Permission {
  switch (action) {
    case "SUBMIT_FOR_FACT_CHECK":
    case "ADVANCE_STAGE":
      return "content:edit";
    case "RECORD_FACT_CHECK":
      return "content:fact_check";
    case "RECORD_PNC_SCREENING":
      return "content:pnc_review";
    case "APPROVE":
    case "REJECT":
      return "content:approve";
    case "RECORD_PUBLISHED":
      return "content:publish";
    case "REQUEST_REVISION":
      return item.status === "FACT_CHECK" ? "content:fact_check" : item.status === "PNC_REVIEW" ? "content:pnc_review" : "content:approve";
  }
}

const passed = (r?: ApprovalRecord) => r?.decision === "PASS";

export function isPublishable(item: ContentItem): boolean {
  return item.status === "APPROVED" && passed(item.factCheck) && passed(item.pncScreening) && item.approval?.decision === "APPROVED";
}

function record(action: string, decision: ApprovalRecord["decision"], actor: PublicUser, now: string, notes?: string): ApprovalRecord {
  return { id: randomUUID(), action, decision, reviewerId: actor.id, reviewerName: actor.displayName, date: now, notes };
}

const deny = (error: string): WorkflowResult => ({ ok: false, status: 403, error });
const conflict = (error: string): WorkflowResult => ({ ok: false, status: 409, error });

export function applyContentAction(input: ContentItem, action: ContentAction, actor: PublicUser, now = new Date().toISOString()): WorkflowResult {
  const perm = requiredPermission(action.action, input);
  if (!can(actor.role, perm)) return deny(`Your role (${actor.role}) cannot perform ${action.action}.`);

  const item: ContentItem = structuredClone(input);
  const isAuthor = item.authorId === actor.id;

  switch (action.action) {
    case "SUBMIT_FOR_FACT_CHECK": {
      if (!["DRAFT", "REVISION_REQUIRED"].includes(item.status)) return conflict(`Cannot submit from status ${item.status}.`);
      if (item.status === "DRAFT" && passed(item.pncScreening)) return conflict("Already cleared — advance production stages instead.");
      item.factCheck = undefined;
      item.pncScreening = undefined;
      item.approval = undefined;
      item.status = "FACT_CHECK";
      item.stage = "SCIENTIFIC_FACT_CHECKING";
      item.history.push(record("SUBMITTED_FOR_FACT_CHECK", "RECORDED", actor, now));
      return { ok: true, item, summary: "Submitted for scientific fact-checking." };
    }
    case "RECORD_FACT_CHECK": {
      if (item.status !== "FACT_CHECK") return conflict("Item is not awaiting fact-check.");
      if (isAuthor) return deny("The author cannot fact-check their own content.");
      const r = record("FACT_CHECK", action.decision, actor, now, action.notes);
      item.factCheck = r;
      item.history.push(r);
      if (action.decision === "PASS") {
        item.status = "PNC_REVIEW";
        item.stage = "PNC_CONFIDENTIALITY_SCREENING";
        return { ok: true, item, summary: "Fact-check passed. Sent to PNC confidentiality screening." };
      }
      item.status = "REVISION_REQUIRED";
      item.stage = "TOPIC_RESEARCH";
      return { ok: true, item, summary: "Fact-check failed. Revision required." };
    }
    case "RECORD_PNC_SCREENING": {
      if (item.status !== "PNC_REVIEW") return conflict("Item is not awaiting PNC screening.");
      if (!passed(item.factCheck)) return conflict("A passing fact-check is required before PNC screening.");
      if (isAuthor) return deny("The author cannot PNC-screen their own content.");
      const r = record("PNC_SCREENING", action.decision, actor, now, action.notes);
      item.pncScreening = r;
      item.history.push(r);
      if (action.decision === "PASS") {
        item.status = "DRAFT";
        item.stage = "SCRIPT";
        return { ok: true, item, summary: "PNC screening passed. Cleared for production (script)." };
      }
      item.status = "REVISION_REQUIRED";
      item.stage = "TOPIC_RESEARCH";
      return { ok: true, item, summary: "PNC screening failed. Revision required." };
    }
    case "ADVANCE_STAGE": {
      if (item.status !== "DRAFT") return conflict(`Cannot advance production while status is ${item.status}.`);
      if (!passed(item.factCheck) || !passed(item.pncScreening)) return conflict("Fact-check and PNC screening must pass before production.");
      const idx = PRODUCTION.indexOf(item.stage);
      if (idx === -1) return conflict(`Stage ${item.stage} cannot be advanced manually.`);
      if (item.stage === "FINAL_REVIEW") {
        item.stage = "HUMAN_APPROVAL";
        item.status = "READY_FOR_APPROVAL";
        item.history.push(record("SUBMITTED_FOR_APPROVAL", "RECORDED", actor, now));
        return { ok: true, item, summary: "Final review complete. Waiting for human approval." };
      }
      item.stage = PRODUCTION[idx + 1];
      item.history.push(record(`STAGE_${item.stage}`, "RECORDED", actor, now));
      return { ok: true, item, summary: `Moved to ${item.stage.replaceAll("_", " ").toLowerCase()}.` };
    }
    case "APPROVE": {
      if (item.status !== "READY_FOR_APPROVAL") return conflict("Item is not ready for approval.");
      if (!passed(item.factCheck) || !passed(item.pncScreening)) return conflict("Fact-check and PNC screening records are required.");
      if (isAuthor) return deny("The author cannot approve their own content.");
      const r = record("HUMAN_APPROVAL", "APPROVED", actor, now, action.notes);
      item.approval = r;
      item.history.push(r);
      item.status = "APPROVED";
      item.stage = "TIKTOK_PUBLISHING";
      return { ok: true, item, summary: "Approved for publishing. Post manually, then record the URL." };
    }
    case "REQUEST_REVISION": {
      if (!["FACT_CHECK", "PNC_REVIEW", "READY_FOR_APPROVAL", "APPROVED"].includes(item.status)) return conflict(`Cannot request revision from ${item.status}.`);
      item.history.push(record("REVISION_REQUESTED", "REVISION_REQUIRED", actor, now, action.notes));
      item.approval = undefined;
      item.status = "REVISION_REQUIRED";
      item.stage = "SCRIPT";
      return { ok: true, item, summary: "Revision requested. Content must be re-checked before approval." };
    }
    case "REJECT": {
      if (item.status === "PUBLISHED" || item.status === "REJECTED") return conflict(`Cannot reject from ${item.status}.`);
      item.history.push(record("REJECTED", "REJECTED", actor, now, action.notes));
      item.status = "REJECTED";
      return { ok: true, item, summary: "Content rejected." };
    }
    case "RECORD_PUBLISHED": {
      if (!isPublishable(item)) return conflict("Publishing blocked: requires PASS fact-check, PASS PNC screening and human approval.");
      item.history.push(record("PUBLISHED_MANUALLY", "RECORDED", actor, now, action.url));
      item.publishedUrl = action.url;
      item.status = "PUBLISHED";
      item.stage = "PERFORMANCE_ANALYTICS";
      return { ok: true, item, summary: "Publication recorded." };
    }
  }
}

export function stageIndex(stage: ContentStage) {
  return CONTENT_STAGES.indexOf(stage);
}
