// ─────────────────────────────────────────────────────────────
// Domain types for SI ACOUSTIC | R&D COMMAND CENTRE
// ─────────────────────────────────────────────────────────────

export const ROLES = ["ADMIN", "R&D_MANAGER", "R&D_ENGINEER", "MANAGEMENT_VIEWER", "TV_VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  isDemo: boolean;
  createdAt: string;
}

/** User shape that is safe to send to the browser. */
export type PublicUser = Pick<User, "id" | "username" | "displayName" | "role">;

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export const TASK_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string; // YYYY-MM-DD (Asia/Kuala_Lumpur)
  projectId?: string;
  ownerId: string;
  dependsOn: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
}

export const PROJECT_STAGES = ["CONCEPT", "FEASIBILITY", "RESEARCH", "PROTOTYPE", "TESTING", "PILOT", "COMMERCIALISATION", "ON_HOLD"] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type Health = "GREEN" | "AMBER" | "RED";

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  status: "PLANNED" | "IN_PROGRESS" | "DONE" | "AT_RISK";
  owner: string;
}

export interface Risk {
  id: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
}

export interface ApprovalRecord {
  id: string;
  action: string;
  decision: "APPROVED" | "REJECTED" | "REVISION_REQUIRED" | "PASS" | "FAIL" | "RECORDED";
  reviewerId: string;
  reviewerName: string;
  date: string;
  notes?: string;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  stage: ProjectStage;
  health: Health;
  progress: number; // 0–100 (demo estimate until entered by authorised users)
  classification: Classification;
  tvVisible: boolean;
  personnel: string[];
  milestones: Milestone[];
  risks: Risk[];
  documentIds: string[];
  objectiveIds: string[];
  approvalHistory: ApprovalRecord[];
  progressHistory: { month: string; progress: number }[];
  isDemo: boolean;
}

export interface ResearchDocument {
  id: string;
  title: string;
  kind: "LITERATURE" | "PAPER_SUMMARY" | "STANDARD" | "TEST_SCHEDULE" | "REPORT";
  classification: Classification;
  projectId?: string;
  authors: string;
  summary: string;
  tags: string[];
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED";
  versions: { version: string; date: string; note: string; by: string }[];
  date: string;
  isDemo: boolean;
}

export interface Grant {
  id: string;
  programme: string;
  agency: string;
  deadline: string;
  eligibility: string;
  requestedFunding: string | null; // null = not yet entered
  progress: number;
  requiredDocuments: { name: string; done: boolean }[];
  ownerName: string;
  projectId?: string;
  outcome: "NOT_SUBMITTED" | "SUBMITTED" | "UNDER_EVALUATION" | "AWARDED" | "UNSUCCESSFUL";
  classification: Classification;
  isDemo: boolean;
}

export interface StrategicObjective {
  id: string;
  title: string;
  horizon: "ANNUAL" | "FIVE_YEAR";
  year: number;
  kpi: string;
  target: string;
  current: string;
  progress: number;
  owner: string;
  isDemo: boolean;
}

export interface Strategy {
  mission: string;
  vision: string;
  tagline: string;
  status: "DRAFT" | "APPROVED";
  roadmap: { year: number; theme: string; outcomes: string[] }[];
  isDemo: boolean;
}

export const CONTENT_STAGES = [
  "TOPIC_RESEARCH",
  "SCIENTIFIC_FACT_CHECKING",
  "PNC_CONFIDENTIALITY_SCREENING",
  "SCRIPT",
  "STORYBOARD",
  "VOICE_OVER",
  "VIDEO_PRODUCTION",
  "FINAL_REVIEW",
  "HUMAN_APPROVAL",
  "TIKTOK_PUBLISHING",
  "PERFORMANCE_ANALYTICS",
] as const;
export type ContentStage = (typeof CONTENT_STAGES)[number];

export const CONTENT_STATUSES = [
  "DRAFT",
  "FACT_CHECK",
  "PNC_REVIEW",
  "REVISION_REQUIRED",
  "READY_FOR_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface ContentItem {
  id: string;
  title: string;
  hook: string;
  language: "BM" | "EN";
  stage: ContentStage;
  status: ContentStatus;
  authorId: string;
  authorName: string;
  script?: string;
  storyboard: { scene: number; visual: string; narration: string }[];
  narrationStatus: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
  canvaStatus: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
  scheduledFor?: string;
  publishedUrl?: string;
  factCheck?: ApprovalRecord;
  pncScreening?: ApprovalRecord;
  approval?: ApprovalRecord;
  history: ApprovalRecord[];
  analytics?: { views: number; likes: number; shares: number; leads: number; affiliateIncome: string | null; recordedAt: string };
  isDemo: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO with +08:00
  end: string;
  kind: "MEETING" | "LAB_TEST" | "DEADLINE" | "REVIEW";
  location?: string;
  classification: Classification;
  isDemo: boolean;
}

export interface Notification {
  id: string;
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  message: string;
  date: string;
  tvSafe: boolean;
}

export interface QuickNote {
  id: string;
  ownerId: string;
  text: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  target?: string;
  outcome: "SUCCESS" | "DENIED" | "FAILURE";
  detail?: string;
  ip?: string;
}

export interface Database {
  schemaVersion: number;
  users: User[];
  sessions: Session[];
  tasks: Task[];
  projects: Project[];
  documents: ResearchDocument[];
  grants: Grant[];
  objectives: StrategicObjective[];
  strategy: Strategy;
  content: ContentItem[];
  events: CalendarEvent[];
  notifications: Notification[];
  notes: QuickNote[];
}
