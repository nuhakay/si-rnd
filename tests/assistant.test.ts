import { describe, it, expect } from "vitest";
import { interpret, type AssistantContext } from "@/lib/assistant/engine";
import type { Project, Task } from "@/types";

const today = "2026-11-20";
const task = (title: string, priority: Task["priority"], status: Task["status"] = "TODO", dueDate = today): Task => ({
  id: title, title, priority, status, dueDate, ownerId: "u", dependsOn: [], createdAt: "", updatedAt: "", isDemo: true,
});
const project = (code: string, title: string, health: Project["health"] = "GREEN"): Project => ({
  id: code, code, title, category: "", description: "", stage: "RESEARCH", health, progress: 40, classification: "INTERNAL", tvVisible: true,
  personnel: [], milestones: [{ id: "m", title: `${code} milestone`, dueDate: "2026-11-25", status: "PLANNED", owner: "" }], risks: [], documentIds: [], objectiveIds: [], approvalHistory: [], progressHistory: [], isDemo: true,
});

const ctx: AssistantContext = {
  user: { id: "u", username: "engineer", displayName: "Eng", role: "R&D_ENGINEER" },
  now: new Date("2026-11-20T08:00:00+08:00"),
  today,
  tasks: [task("Critical one", "CRITICAL"), task("High one", "HIGH"), task("Medium one", "MEDIUM"), task("Low one", "LOW")],
  projects: [project("CHM", "Chameleon Natural Fibre Insulation"), project("ANC", "Active Noise Control Device", "AMBER")],
  deadlines: [{ kind: "MILESTONE", title: "CHM: test booking", date: "2026-11-26", ref: "/projects/CHM", days: 6 }],
  events: [{ id: "e", title: "Stand-up", start: `${today}T09:00:00+08:00`, end: `${today}T09:30:00+08:00`, kind: "MEETING", classification: "INTERNAL", isDemo: true }],
  strategy: { mission: "Reduce noise at source", vision: "V", tagline: "To promote a world without noise", status: "DRAFT", roadmap: [], isDemo: true },
};

describe("AURA rule-based assistant", () => {
  it("greets with time-of-day and a data summary", () => {
    const r = interpret("Good morning, AURA.", ctx);
    expect(r.intent).toBe("greeting");
    expect(r.text).toMatch(/^Good morning, Eng/);
    expect(r.source).toBe("DATABASE_QUERY");
  });
  it("lists the three highest priorities", () => {
    const r = interpret("What are my priorities today?", ctx);
    expect(r.items?.map((i) => i.label)).toEqual(["Critical one", "High one", "Medium one"]);
  });
  it("shows a project's progress by name", () => {
    const r = interpret("Show Chameleon project progress.", ctx);
    expect(r.intent).toBe("project_progress");
    expect(r.text).toMatch(/Chameleon.*40%/);
    expect(r.navigate).toBe("/projects/CHM");
  });
  it("finds the next deadline", () => {
    expect(interpret("What is the next R&D deadline?", ctx).text).toMatch(/CHM: test booking/);
  });
  it("routes navigation commands locally", () => {
    expect(interpret("Open my research library.", ctx)).toMatchObject({ source: "LOCAL_COMMAND", navigate: "/research" });
    expect(interpret("Open the AI Content Factory.", ctx)).toMatchObject({ navigate: "/content-factory" });
    expect(interpret("Prepare a draft weekly report.", ctx)).toMatchObject({ navigate: "/reports?draft=weekly" });
  });
  it("flags projects requiring attention", () => {
    const r = interpret("Show projects requiring attention.", ctx);
    expect(r.intent).toBe("attention");
    expect(r.items?.[0].label).toMatch(/ANC/);
  });
  it("answers the mission question from data", () => {
    expect(interpret("What is our department mission?", ctx).text).toMatch(/Reduce noise at source/);
  });
  it("never pretends to be an external AI", () => {
    const r = interpret("write me a poem about turbines", ctx);
    expect(r.source).toBe("UNRECOGNISED");
    expect(r.text).toMatch(/no external AI/i);
  });
  it("blocks report generation for read-only roles", () => {
    const r = interpret("Prepare a draft weekly report", { ...ctx, user: { ...ctx.user, role: "MANAGEMENT_VIEWER" } });
    expect(r.navigate).toBeUndefined();
  });
});
