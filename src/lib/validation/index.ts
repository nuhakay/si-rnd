import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");
const cleanText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // strip ASCII control chars (keep newline/tab)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""));

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64).regex(/^[a-z0-9._-]+$/, "Invalid username"),
  password: z.string().min(1).max(256),
});

export const taskCreateSchema = z.object({
  title: cleanText(200).pipe(z.string().min(1, "Title is required")),
  notes: cleanText(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  dueDate: isoDate.optional(),
  projectId: z.string().uuid().optional(),
  dependsOn: z.array(z.string().uuid()).max(20).default([]),
});

export const taskUpdateSchema = z
  .object({
    title: cleanText(200).pipe(z.string().min(1)).optional(),
    notes: cleanText(2000).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: isoDate.nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, "No changes supplied");

export const noteSchema = z.object({ text: cleanText(1000).pipe(z.string().min(1)) });

export const assistantSchema = z.object({ message: cleanText(500).pipe(z.string().min(1)) });

export const contentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SUBMIT_FOR_FACT_CHECK") }),
  z.object({ action: z.literal("RECORD_FACT_CHECK"), decision: z.enum(["PASS", "FAIL"]), notes: cleanText(1000).optional() }),
  z.object({ action: z.literal("RECORD_PNC_SCREENING"), decision: z.enum(["PASS", "FAIL"]), notes: cleanText(1000).optional() }),
  z.object({ action: z.literal("APPROVE"), notes: cleanText(1000).optional() }),
  z.object({ action: z.literal("REQUEST_REVISION"), notes: cleanText(1000).pipe(z.string().min(1, "Explain what must change")) }),
  z.object({ action: z.literal("REJECT"), notes: cleanText(1000).pipe(z.string().min(1, "Give a reason")) }),
  z.object({ action: z.literal("RECORD_PUBLISHED"), url: z.string().url().max(500).refine((u) => u.startsWith("https://"), "Must be https") }),
  z.object({ action: z.literal("ADVANCE_STAGE") }),
]);
export type ContentAction = z.infer<typeof contentActionSchema>;

export const contentCreateSchema = z.object({
  title: cleanText(160).pipe(z.string().min(1)),
  hook: cleanText(300).default(""),
  language: z.enum(["BM", "EN"]).default("BM"),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}
