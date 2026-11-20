import { describe, it, expect } from "vitest";
import { taskCreateSchema, taskUpdateSchema, loginSchema, contentActionSchema, assistantSchema } from "@/lib/validation";

describe("input validation", () => {
  it("requires a task title and trims/sanitises it", () => {
    expect(taskCreateSchema.safeParse({ title: "   " }).success).toBe(false);
    const r = taskCreateSchema.parse({ title: "  Book lab\u0007 " });
    expect(r.title).toBe("Book lab");
    expect(r.priority).toBe("MEDIUM");
  });
  it("rejects bad dates, priorities, and over-long text", () => {
    expect(taskCreateSchema.safeParse({ title: "x", dueDate: "20/11/2026" }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: "x", priority: "URGENT" }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
  });
  it("rejects unknown fields on task update (no mass assignment)", () => {
    expect(taskUpdateSchema.safeParse({ ownerId: "someone-else" }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({}).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ status: "DONE" }).success).toBe(true);
  });
  it("normalises usernames and rejects odd characters", () => {
    expect(loginSchema.parse({ username: " Admin ", password: "p" }).username).toBe("admin");
    expect(loginSchema.safeParse({ username: "a'; DROP", password: "p" }).success).toBe(false);
  });
  it("requires https URLs and reasons for content decisions", () => {
    expect(contentActionSchema.safeParse({ action: "RECORD_PUBLISHED", url: "http://x.com" }).success).toBe(false);
    expect(contentActionSchema.safeParse({ action: "REJECT", notes: "" }).success).toBe(false);
    expect(contentActionSchema.safeParse({ action: "DELETE_ALL" }).success).toBe(false);
  });
  it("limits assistant input length", () => {
    expect(assistantSchema.safeParse({ message: "a".repeat(501) }).success).toBe(false);
  });
});
