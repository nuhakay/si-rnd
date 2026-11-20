import { randomUUID } from "node:crypto";
import type { Database, Role, User } from "@/types";
import { hashPassword } from "@/lib/auth/password";
import { addDays, klDateString } from "@/lib/time";

/**
 * DEMONSTRATION DATA — every record is flagged `isDemo: true` and shown with a
 * DEMO badge in the UI. Names, dates and percentages are placeholders, not
 * SI Acoustic facts. No certifications, results, expenditure or approvals are
 * claimed. Replace through the app once verified data is entered by authorised users.
 *
 * Dates are generated relative to the first-run date so the demo stays current.
 */
export const DEV_DEMO_PASSWORD = "Aura#Demo2026";

function demoPassword(): string {
  const p = process.env.SEED_DEMO_PASSWORD;
  if (p && p.length >= 12) return p;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo accounts in production without SEED_DEMO_PASSWORD (≥12 chars).");
  }
  return DEV_DEMO_PASSWORD;
}

const id = () => randomUUID();

export async function buildSeed(today = klDateString()): Promise<Database> {
  const d = (n: number) => addDays(today, n);
  const at = (n: number, hhmm: string) => `${d(n)}T${hhmm}:00+08:00`;
  const now = new Date().toISOString();
  const pw = await hashPassword(demoPassword());

  const mkUser = (username: string, displayName: string, role: Role): User => ({
    id: id(), username, displayName, role, passwordHash: pw, active: true, isDemo: true, createdAt: now,
  });
  const admin = mkUser("admin", "Demo Administrator", "ADMIN");
  const manager = mkUser("manager", "Demo R&D Manager", "R&D_MANAGER");
  const engineer = mkUser("engineer", "Demo R&D Engineer", "R&D_ENGINEER");
  const viewer = mkUser("viewer", "Demo Management Viewer", "MANAGEMENT_VIEWER");
  const tv = mkUser("tv", "R&D Office TV", "TV_VIEWER");

  const obj = {
    sustain: id(), quiet: id(), funding: id(), knowledge: id(), digital: id(),
  };
  const doc = { iso354: id(), iso10140: id(), astm423: id(), iso11654: id(), lit1: id(), lit2: id(), lab1: id(), rpt1: id(), chm: id() };
  const prj = { chm: id(), anc: id(), aer: id(), knf: id(), grt: id(), npi: id() };

  const ms = (title: string, offset: number, status: "PLANNED" | "IN_PROGRESS" | "DONE" | "AT_RISK", owner = "Demo Engineer A") =>
    ({ id: id(), title, dueDate: d(offset), status, owner });
  const hist = (vals: number[]) => {
    const months = vals.map((_, i) => {
      const dt = new Date(`${today}T00:00:00+08:00`);
      dt.setMonth(dt.getMonth() - (vals.length - 1 - i));
      return dt.toLocaleString("en-MY", { month: "short", timeZone: "Asia/Kuala_Lumpur" });
    });
    return vals.map((p, i) => ({ month: months[i], progress: p }));
  };

  return {
    schemaVersion: 1,
    users: [admin, manager, engineer, viewer, tv],
    sessions: [],
    projects: [
      {
        id: prj.chm, code: "CHM", title: "Chameleon Natural Fibre Insulation", category: "Sustainable acoustic materials",
        description: "Development of a natural-fibre acoustic and thermal insulation product line. Formulation details are held in RESTRICTED documents only.",
        stage: "PROTOTYPE", health: "GREEN", progress: 45, classification: "CONFIDENTIAL", tvVisible: true,
        personnel: ["Demo R&D Manager", "Demo Engineer A", "Demo Lab Technician"],
        milestones: [
          ms("Raw fibre characterisation complete", -30, "DONE"),
          ms("Prototype panel batch #1", -2, "DONE"),
          ms("Absorption test booking (reverberation room)", 6, "IN_PROGRESS"),
          ms("Prototype review with management", 21, "PLANNED", "Demo R&D Manager"),
        ],
        risks: [{ id: id(), description: "Lab test slot availability may delay absorption data", severity: "MEDIUM", mitigation: "Book alternative accredited lab as backup" }],
        documentIds: [doc.iso354, doc.astm423, doc.lab1, doc.chm], objectiveIds: [obj.sustain, obj.quiet],
        approvalHistory: [], progressHistory: hist([10, 18, 26, 33, 40, 45]), isDemo: true,
      },
      {
        id: prj.anc, code: "ANC", title: "Active Noise Control Device", category: "Electro-acoustics",
        description: "Feasibility and early research into an active noise control device for low-frequency machinery noise.",
        stage: "RESEARCH", health: "AMBER", progress: 30, classification: "CONFIDENTIAL", tvVisible: true,
        personnel: ["Demo Engineer B", "Demo Engineer A"],
        milestones: [
          ms("Literature and patent landscape review", -14, "DONE", "Demo Engineer B"),
          ms("Controller algorithm bench test", -3, "AT_RISK", "Demo Engineer B"),
          ms("Hardware component shortlist", 10, "PLANNED", "Demo Engineer B"),
        ],
        risks: [
          { id: id(), description: "Bench test behind schedule — DSP board lead time", severity: "HIGH", mitigation: "Use evaluation kit for interim testing" },
          { id: id(), description: "Freedom-to-operate not yet assessed", severity: "MEDIUM", mitigation: "Schedule IP review before prototype stage" },
        ],
        documentIds: [doc.lit2], objectiveIds: [obj.quiet], approvalHistory: [], progressHistory: hist([5, 10, 16, 22, 27, 30]), isDemo: true,
      },
      {
        id: prj.aer, code: "AER", title: "Acoustic Engineering Research", category: "Core research",
        description: "Ongoing applied research supporting enclosure and acoustic panel engineering, test methods and design guides.",
        stage: "RESEARCH", health: "GREEN", progress: 55, classification: "INTERNAL", tvVisible: true,
        personnel: ["Demo R&D Manager", "Demo Engineer C"],
        milestones: [
          ms("Internal test method guide v1", -20, "DONE", "Demo Engineer C"),
          ms("Standards register review", 3, "IN_PROGRESS", "Demo Engineer C"),
          ms("Quarterly research seminar", 28, "PLANNED", "Demo R&D Manager"),
        ],
        risks: [],
        documentIds: [doc.iso10140, doc.iso11654, doc.lit1], objectiveIds: [obj.knowledge, obj.quiet], approvalHistory: [],
        progressHistory: hist([30, 36, 41, 47, 52, 55]), isDemo: true,
      },
      {
        id: prj.knf, code: "KNF", title: "Kenaf Supply Chain Feasibility", category: "Supply chain",
        description: "Feasibility study of local kenaf fibre sourcing: suppliers, consistency, logistics and lead times.",
        stage: "FEASIBILITY", health: "AMBER", progress: 25, classification: "INTERNAL", tvVisible: true,
        personnel: ["Demo Engineer A", "Demo Procurement Liaison"],
        milestones: [
          ms("Supplier long-list", -7, "DONE"),
          ms("Sample requests sent to suppliers", 2, "IN_PROGRESS"),
          ms("Feasibility summary for management", 35, "PLANNED", "Demo R&D Manager"),
        ],
        risks: [{ id: id(), description: "Fibre quality consistency between batches unknown", severity: "MEDIUM", mitigation: "Request multiple batches per supplier" }],
        documentIds: [], objectiveIds: [obj.sustain], approvalHistory: [], progressHistory: hist([0, 5, 10, 15, 20, 25]), isDemo: true,
      },
      {
        id: prj.grt, code: "GRT", title: "Research Funding and Grants", category: "Funding",
        description: "Identify, prepare and track research funding applications that align with R&D projects.",
        stage: "RESEARCH", health: "GREEN", progress: 40, classification: "INTERNAL", tvVisible: true,
        personnel: ["Demo R&D Manager"],
        milestones: [ms("Grant pipeline review", 4, "PLANNED", "Demo R&D Manager"), ms("Application package draft", 12, "IN_PROGRESS", "Demo R&D Manager")],
        risks: [], documentIds: [], objectiveIds: [obj.funding], approvalHistory: [], progressHistory: hist([10, 15, 22, 30, 35, 40]), isDemo: true,
      },
      {
        id: prj.npi, code: "NPI", title: "New Product Innovation", category: "Innovation pipeline",
        description: "Early-stage idea pipeline for new noise control solutions. Concepts are RESTRICTED until screened.",
        stage: "CONCEPT", health: "GREEN", progress: 10, classification: "RESTRICTED", tvVisible: false,
        personnel: ["Demo R&D Manager"],
        milestones: [ms("Idea screening workshop", 14, "PLANNED", "Demo R&D Manager")],
        risks: [], documentIds: [], objectiveIds: [obj.digital, obj.quiet], approvalHistory: [], progressHistory: hist([0, 0, 2, 5, 8, 10]), isDemo: true,
      },
    ],
    tasks: [
      { title: "Confirm reverberation room booking for CHM panels", priority: "CRITICAL", status: "IN_PROGRESS", dueDate: d(0), projectId: prj.chm, ownerId: engineer.id },
      { title: "Recover ANC bench test schedule", priority: "HIGH", status: "BLOCKED", dueDate: d(-2), projectId: prj.anc, ownerId: engineer.id },
      { title: "Send kenaf sample request emails", priority: "HIGH", status: "TODO", dueDate: d(1), projectId: prj.knf, ownerId: engineer.id },
      { title: "Update standards register entries", priority: "MEDIUM", status: "TODO", dueDate: d(3), projectId: prj.aer, ownerId: engineer.id },
      { title: "Review grant document checklist", priority: "HIGH", status: "TODO", dueDate: d(0), projectId: prj.grt, ownerId: manager.id },
      { title: "Fact-check episode script: machine noise at source", priority: "MEDIUM", status: "TODO", dueDate: d(2), ownerId: engineer.id },
      { title: "Prepare weekly R&D report", priority: "MEDIUM", status: "TODO", dueDate: d(1), ownerId: manager.id },
      { title: "Archive old prototype photos", priority: "LOW", status: "DONE", dueDate: d(-1), ownerId: engineer.id, completedAt: now },
    ].map((t) => ({ id: id(), dependsOn: [], createdAt: now, updatedAt: now, isDemo: true, ...t }) as Database["tasks"][number]),
    documents: [
      { id: doc.iso354, title: "ISO 354 — Measurement of sound absorption in a reverberation room", kind: "STANDARD", classification: "PUBLIC", authors: "ISO", summary: "Register entry. Confirm the edition held by the company before citing.", tags: ["absorption", "test method"], status: "APPROVED", versions: [{ version: "1", date: d(-60), note: "Added to register", by: "Demo Engineer C" }], date: d(-60), isDemo: true },
      { id: doc.iso10140, title: "ISO 10140 series — Laboratory measurement of sound insulation of building elements", kind: "STANDARD", classification: "PUBLIC", authors: "ISO", summary: "Register entry for airborne and impact sound insulation laboratory methods.", tags: ["insulation", "test method"], status: "APPROVED", versions: [{ version: "1", date: d(-60), note: "Added to register", by: "Demo Engineer C" }], date: d(-60), isDemo: true },
      { id: doc.iso11654, title: "ISO 11654 — Rating of sound absorption", kind: "STANDARD", classification: "PUBLIC", authors: "ISO", summary: "Register entry for single-number absorption ratings.", tags: ["absorption", "rating"], status: "APPROVED", versions: [{ version: "1", date: d(-58), note: "Added to register", by: "Demo Engineer C" }], date: d(-58), isDemo: true },
      { id: doc.astm423, title: "ASTM C423 — Sound absorption by the reverberation room method", kind: "STANDARD", classification: "PUBLIC", authors: "ASTM", summary: "Register entry. Confirm the edition before use.", tags: ["absorption", "test method"], status: "APPROVED", versions: [{ version: "1", date: d(-55), note: "Added to register", by: "Demo Engineer C" }], date: d(-55), isDemo: true },
      { id: doc.lit1, title: "[DEMO] Literature entry — natural-fibre porous absorbers review", kind: "LITERATURE", classification: "INTERNAL", projectId: prj.aer, authors: "Citation to be entered", summary: "Placeholder. Enter the full citation and an engineer-written summary.", tags: ["natural fibre", "porous absorber"], status: "DRAFT", versions: [{ version: "0.1", date: d(-10), note: "Placeholder created", by: "Demo Engineer C" }], date: d(-10), isDemo: true },
      { id: doc.lit2, title: "[DEMO] Paper summary — active noise control for low-frequency machinery", kind: "PAPER_SUMMARY", classification: "CONFIDENTIAL", projectId: prj.anc, authors: "Citation to be entered", summary: "Placeholder internal summary linked to the ANC project.", tags: ["ANC", "low frequency"], status: "UNDER_REVIEW", versions: [{ version: "0.2", date: d(-5), note: "Draft summary", by: "Demo Engineer B" }], date: d(-5), isDemo: true },
      { id: doc.lab1, title: "[DEMO] Lab test schedule — CHM prototype batch #1", kind: "TEST_SCHEDULE", classification: "INTERNAL", projectId: prj.chm, authors: "Demo Lab Technician", summary: "Planned tests: absorption (reverberation room). No results recorded.", tags: ["CHM", "schedule"], status: "DRAFT", versions: [{ version: "0.1", date: d(-1), note: "Schedule drafted", by: "Demo Lab Technician" }], date: d(-1), isDemo: true },
      { id: doc.chm, title: "[DEMO] CHM formulation record (placeholder — no real data)", kind: "REPORT", classification: "RESTRICTED", projectId: prj.chm, authors: "Demo R&D Manager", summary: "RESTRICTED placeholder to demonstrate access control. Contains no formulation.", tags: ["CHM", "restricted"], status: "DRAFT", versions: [{ version: "0.1", date: d(-3), note: "Placeholder", by: "Demo R&D Manager" }], date: d(-3), isDemo: true },
      { id: doc.rpt1, title: "[DEMO] Approved report placeholder — internal test method guide v1", kind: "REPORT", classification: "INTERNAL", projectId: prj.aer, authors: "Demo Engineer C", summary: "Placeholder showing an approved internal report record.", tags: ["method"], status: "APPROVED", versions: [{ version: "1.0", date: d(-20), note: "Approved (demo record)", by: "Demo R&D Manager" }, { version: "0.9", date: d(-25), note: "Review draft", by: "Demo Engineer C" }], date: d(-20), isDemo: true },
    ],
    grants: [
      { id: id(), programme: "[DEMO] Government R&D grant — programme to be confirmed", agency: "Agency to be confirmed", deadline: d(18), eligibility: "To be verified against official guidelines", requestedFunding: null, progress: 45, requiredDocuments: [{ name: "Project proposal", done: true }, { name: "Company profile", done: true }, { name: "Budget breakdown", done: false }, { name: "Technical milestones", done: false }], ownerName: "Demo R&D Manager", projectId: prj.chm, outcome: "NOT_SUBMITTED", classification: "CONFIDENTIAL", isDemo: true },
      { id: id(), programme: "[DEMO] Commercialisation fund — programme to be confirmed", agency: "Agency to be confirmed", deadline: d(45), eligibility: "To be verified", requestedFunding: null, progress: 10, requiredDocuments: [{ name: "Concept note", done: false }, { name: "Market assessment", done: false }], ownerName: "Demo R&D Manager", projectId: prj.anc, outcome: "NOT_SUBMITTED", classification: "CONFIDENTIAL", isDemo: true },
      { id: id(), programme: "[DEMO] Industry–university collaboration grant", agency: "Partner to be confirmed", deadline: d(-12), eligibility: "To be verified", requestedFunding: null, progress: 100, requiredDocuments: [{ name: "Collaboration letter", done: true }, { name: "Proposal", done: true }], ownerName: "Demo R&D Manager", projectId: prj.aer, outcome: "UNDER_EVALUATION", classification: "INTERNAL", isDemo: true },
    ],
    objectives: [
      { id: obj.quiet, title: "Advance noise control solutions that reduce noise at source", horizon: "ANNUAL", year: Number(today.slice(0, 4)), kpi: "Projects reaching prototype stage", target: "To be set by R&D Manager", current: "2 projects in prototype/research (demo)", progress: 40, owner: "Demo R&D Manager", isDemo: true },
      { id: obj.sustain, title: "Develop sustainable, locally sourced acoustic materials", horizon: "ANNUAL", year: Number(today.slice(0, 4)), kpi: "Natural-fibre material milestones met", target: "To be set", current: "Demo estimate", progress: 35, owner: "Demo R&D Manager", isDemo: true },
      { id: obj.funding, title: "Secure external research funding", horizon: "ANNUAL", year: Number(today.slice(0, 4)), kpi: "Applications submitted", target: "To be set", current: "1 under evaluation (demo)", progress: 30, owner: "Demo R&D Manager", isDemo: true },
      { id: obj.knowledge, title: "Build an internal acoustic knowledge base", horizon: "ANNUAL", year: Number(today.slice(0, 4)), kpi: "Approved internal reports and method guides", target: "To be set", current: "Demo estimate", progress: 50, owner: "Demo Engineer C", isDemo: true },
      { id: obj.digital, title: "Establish a structured innovation pipeline", horizon: "FIVE_YEAR", year: Number(today.slice(0, 4)) + 4, kpi: "Screened concepts per year", target: "To be set", current: "Pipeline being set up", progress: 10, owner: "Demo R&D Manager", isDemo: true },
    ],
    strategy: {
      tagline: "To promote a world without noise",
      mission: "[DRAFT — to be confirmed by the R&D Manager] Research, develop and validate practical noise control solutions that reduce noise at source for industry and buildings.",
      vision: "[DRAFT — to be confirmed] To be a trusted R&D centre for acoustic engineering and sustainable noise control materials in Malaysia and the region.",
      status: "DRAFT",
      roadmap: [
        { year: Number(today.slice(0, 4)), theme: "Foundations", outcomes: ["Knowledge base and standards register", "CHM prototype testing", "Grant pipeline"] },
        { year: Number(today.slice(0, 4)) + 1, theme: "Validation", outcomes: ["Accredited test data for prototypes", "ANC feasibility decision"] },
        { year: Number(today.slice(0, 4)) + 2, theme: "Pilot", outcomes: ["Pilot installations", "Local fibre supply agreements"] },
        { year: Number(today.slice(0, 4)) + 3, theme: "Scale", outcomes: ["Product line launch readiness"] },
        { year: Number(today.slice(0, 4)) + 4, theme: "Innovation leadership", outcomes: ["Continuous innovation pipeline"] },
      ],
      isDemo: true,
    },
    content: [
      { id: id(), title: "Kenapa bunyi bising di kilang perlu dikawal?", hook: "Anda dengar bunyi ini setiap hari — tapi tahukah anda kesannya?", language: "BM", stage: "SCRIPT", status: "DRAFT", authorId: engineer.id, authorName: engineer.displayName, script: "[DEMO] Skrip ringkas tentang kepentingan mengawal bunyi bising di punca.", storyboard: [{ scene: 1, visual: "Ilustrasi pekerja di lantai kilang", narration: "Anda dengar bunyi ini setiap hari..." }, { scene: 2, visual: "Gelombang bunyi dari mesin", narration: "Bunyi bising boleh dikurangkan di punca." }], narrationStatus: "NOT_STARTED", canvaStatus: "NOT_STARTED", history: [], isDemo: true },
      { id: id(), title: "Bunyi tidak boleh dihapuskan — hanya dipindahkan", hook: "Mitos: bunyi bising boleh 'dibuang'. Faktanya?", language: "BM", stage: "SCIENTIFIC_FACT_CHECKING", status: "FACT_CHECK", authorId: engineer.id, authorName: engineer.displayName, script: "[DEMO] Tenaga bunyi dipindahkan dan dikurangkan, bukan dihapuskan.", storyboard: [{ scene: 1, visual: "Gelombang memasuki panel", narration: "Tenaga bunyi berubah bentuk..." }], narrationStatus: "NOT_STARTED", canvaStatus: "NOT_STARTED", history: [], isDemo: true },
      { id: id(), title: "3 tanda tempat kerja anda terlalu bising", hook: "Perlu menjerit untuk bercakap? Itu tanda pertama.", language: "BM", stage: "FINAL_REVIEW", status: "READY_FOR_APPROVAL", authorId: engineer.id, authorName: engineer.displayName, script: "[DEMO] Tiga tanda ringkas dan cadangan penyelesaian kawalan bising.", storyboard: [{ scene: 1, visual: "Dua pekerja menjerit", narration: "Perlu menjerit untuk bercakap?" }], narrationStatus: "DONE", canvaStatus: "DONE",
        factCheck: { id: id(), action: "FACT_CHECK", decision: "PASS", reviewerId: engineer.id, reviewerName: engineer.displayName, date: at(-2, "10:00"), notes: "Demo record" },
        pncScreening: { id: id(), action: "PNC_SCREENING", decision: "PASS", reviewerId: manager.id, reviewerName: manager.displayName, date: at(-1, "15:30"), notes: "Demo record — no proprietary content" },
        history: [], isDemo: true },
    ],
    events: [
      { id: id(), title: "R&D weekly stand-up", start: at(0, "09:00"), end: at(0, "09:30"), kind: "MEETING", location: "R&D room", classification: "INTERNAL", isDemo: true },
      { id: id(), title: "CHM prototype design review", start: at(0, "14:30"), end: at(0, "15:30"), kind: "REVIEW", location: "Meeting room 2", classification: "INTERNAL", isDemo: true },
      { id: id(), title: "Kenaf supplier call", start: at(1, "11:00"), end: at(1, "11:45"), kind: "MEETING", classification: "INTERNAL", isDemo: true },
      { id: id(), title: "Lab session: CHM sample preparation", start: at(2, "09:30"), end: at(2, "12:30"), kind: "LAB_TEST", location: "Lab", classification: "INTERNAL", isDemo: true },
      { id: id(), title: "Content review: TikTok episode batch", start: at(3, "16:00"), end: at(3, "16:45"), kind: "REVIEW", classification: "INTERNAL", isDemo: true },
      { id: id(), title: "Management R&D update", start: at(5, "10:00"), end: at(5, "11:00"), kind: "MEETING", classification: "INTERNAL", isDemo: true },
    ],
    notifications: [
      { id: id(), level: "WARNING", message: "ANC bench test milestone is at risk", date: now, tvSafe: true },
      { id: id(), level: "INFO", message: "Demo data loaded — replace with verified company data", date: now, tvSafe: true },
      { id: id(), level: "SUCCESS", message: "CHM prototype batch #1 milestone marked done", date: now, tvSafe: true },
      { id: id(), level: "INFO", message: "One content item is waiting for human approval", date: now, tvSafe: false },
    ],
    notes: [],
  };
}
