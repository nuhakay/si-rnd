import type { CalendarEvent, Project, PublicUser, Strategy, Task } from "@/types";
import { can } from "@/lib/permissions";
import { daysUntil, formatKlDate, formatKlTime, klHour, relativeDue, TIMEZONE } from "@/lib/time";

/**
 * AURA v1 — rule-based command processor. It does NOT call any AI model.
 * Every reply is tagged with where it came from:
 *  - LOCAL_COMMAND   : handled entirely in the app (navigation, time, help)
 *  - DATABASE_QUERY  : answered from live application data the user is allowed to see
 *  - EXTERNAL_AI     : reserved for a future, explicitly-enabled AI provider
 *  - UNRECOGNISED    : no rule matched
 */
export type AssistantSource = "LOCAL_COMMAND" | "DATABASE_QUERY" | "EXTERNAL_AI" | "UNRECOGNISED";

export interface AssistantReply {
  intent: string;
  source: AssistantSource;
  text: string;
  items?: { label: string; detail?: string; href?: string }[];
  navigate?: string;
}

export interface AssistantContext {
  user: PublicUser;
  now: Date;
  today: string;
  tasks: Task[];
  projects: Project[];
  deadlines: { kind: string; title: string; date: string; ref: string; days: number }[];
  events: CalendarEvent[];
  strategy: Strategy | null;
}

interface Rule {
  intent: string;
  match: RegExp;
  handle: (ctx: AssistantContext, m: RegExpMatchArray, raw: string) => AssistantReply;
}

const greetingFor = (h: number) => (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

function topPriorities(ctx: AssistantContext, n = 3) {
  return ctx.tasks.filter((t) => t.status !== "DONE").slice(0, n);
}

function taskItem(t: Task) {
  return { label: t.title, detail: `${t.priority}${t.dueDate ? ` · ${relativeDue(t.dueDate)}` : ""}${t.status === "BLOCKED" ? " · BLOCKED" : ""}`, href: "/tasks" };
}

function findProject(ctx: AssistantContext, raw: string): Project | undefined {
  const q = raw.toLowerCase();
  return (
    ctx.projects.find((p) => q.includes(p.code.toLowerCase()) && new RegExp(`\\b${p.code.toLowerCase()}\\b`).test(q)) ??
    ctx.projects.find((p) => p.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3).some((w) => q.includes(w)))
  );
}

const nav = (intent: string, href: string, text: string): AssistantReply => ({ intent, source: "LOCAL_COMMAND", text, navigate: href });

export const RULES: Rule[] = [
  {
    intent: "help",
    match: /^(help|what can you do|commands|bantuan)\b/i,
    handle: () => ({
      intent: "help",
      source: "LOCAL_COMMAND",
      text: "I'm AURA, running local rules over your dashboard data. Try:",
      items: [
        "Good morning, AURA",
        "What are my priorities today?",
        "Show Chameleon project progress",
        "What is the next R&D deadline?",
        "Show projects requiring attention",
        "Prepare a draft weekly report",
        "What's on my calendar today?",
        "Open my research library",
        "Open the AI Content Factory",
        "What is our department mission?",
      ].map((label) => ({ label })),
    }),
  },
  {
    intent: "greeting",
    match: /\b(good (morning|afternoon|evening)|hello|hi|hey|selamat (pagi|petang|tengah hari|malam))\b/i,
    handle: (ctx) => {
      const p = topPriorities(ctx);
      const overdue = ctx.tasks.filter((t) => t.status !== "DONE" && t.dueDate && daysUntil(t.dueDate, ctx.today) < 0).length;
      const meetings = ctx.events.filter((e) => e.start.slice(0, 10) === ctx.today).length;
      return {
        intent: "greeting",
        source: "DATABASE_QUERY",
        text: `${greetingFor(klHour(ctx.now))}, ${ctx.user.displayName}. You have ${p.length} priority task${p.length === 1 ? "" : "s"}, ${meetings} event${meetings === 1 ? "" : "s"} today${overdue ? ` and ${overdue} overdue task${overdue === 1 ? "" : "s"}` : ""}.`,
        items: p.map(taskItem),
      };
    },
  },
  {
    intent: "priorities",
    match: /\b(priorit(y|ies)|top tasks|what should i (do|work on)|keutamaan)\b/i,
    handle: (ctx) => {
      if (!can(ctx.user.role, "tasks:read")) return { intent: "priorities", source: "LOCAL_COMMAND", text: "Your role does not include task access." };
      const p = topPriorities(ctx);
      return { intent: "priorities", source: "DATABASE_QUERY", text: p.length ? `Your top ${p.length} priorities:` : "No open tasks. Nice work.", items: p.map(taskItem) };
    },
  },
  {
    intent: "attention",
    match: /\b(attention|at risk|behind|problem|issues?|red|amber)\b.*\bprojects?\b|\bprojects?\b.*\b(attention|at risk|behind|issues?)\b/i,
    handle: (ctx) => {
      const flagged = ctx.projects
        .map((p) => {
          const reasons: string[] = [];
          if (p.health !== "GREEN") reasons.push(`health ${p.health}`);
          const od = p.milestones.filter((m) => m.status !== "DONE" && daysUntil(m.dueDate, ctx.today) < 0).length;
          if (od) reasons.push(`${od} overdue milestone${od > 1 ? "s" : ""}`);
          if (p.risks.some((r) => r.severity === "HIGH")) reasons.push("high risk");
          return { p, reasons };
        })
        .filter((x) => x.reasons.length);
      return {
        intent: "attention",
        source: "DATABASE_QUERY",
        text: flagged.length ? `${flagged.length} project${flagged.length > 1 ? "s need" : " needs"} attention:` : "All visible projects are on track.",
        items: flagged.map(({ p, reasons }) => ({ label: `${p.code} — ${p.title}`, detail: reasons.join(", "), href: `/projects/${p.id}` })),
      };
    },
  },
  {
    intent: "project_progress",
    match: /\b(progress|status|update)\b.*\b(project|chameleon|anc|noise control|kenaf|grant|innovation|acoustic)\b|\bshow\b.*\bproject\b|\b(chm|anc|aer|knf|grt|npi)\b/i,
    handle: (ctx, _m, raw) => {
      const p = findProject(ctx, raw);
      if (!p) return { intent: "project_progress", source: "DATABASE_QUERY", text: "I couldn't find a project you have access to with that name.", items: ctx.projects.map((x) => ({ label: `${x.code} — ${x.title}`, href: `/projects/${x.id}` })) };
      const next = p.milestones.filter((m) => m.status !== "DONE").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      return {
        intent: "project_progress",
        source: "DATABASE_QUERY",
        text: `${p.title} is at the ${p.stage.toLowerCase()} stage, ${p.progress}% complete, health ${p.health}.${p.isDemo ? " (Demo data.)" : ""}`,
        items: next ? [{ label: `Next milestone: ${next.title}`, detail: `${formatKlDate(next.dueDate)} · ${relativeDue(next.dueDate, ctx.today)}`, href: `/projects/${p.id}` }] : [],
        navigate: `/projects/${p.id}`,
      };
    },
  },
  {
    intent: "next_deadline",
    match: /\b(next|upcoming|nearest)\b.*\b(deadline|due|milestone)s?\b|\bdeadlines?\b|\btarikh akhir\b/i,
    handle: (ctx) => {
      const upcoming = ctx.deadlines.filter((d) => d.days >= 0);
      if (!upcoming.length) return { intent: "next_deadline", source: "DATABASE_QUERY", text: "No upcoming deadlines in the data you can see." };
      const [first, ...rest] = upcoming;
      return {
        intent: "next_deadline",
        source: "DATABASE_QUERY",
        text: `Next deadline: ${first.title} — ${formatKlDate(first.date)} (${relativeDue(first.date, ctx.today).toLowerCase()}).`,
        items: rest.slice(0, 4).map((d) => ({ label: d.title, detail: `${d.kind.toLowerCase()} · ${formatKlDate(d.date)}`, href: d.ref })),
      };
    },
  },
  {
    intent: "calendar",
    match: /\b(calendar|schedule|meetings?|agenda|jadual)\b/i,
    handle: (ctx) => {
      const todays = ctx.events.filter((e) => e.start.slice(0, 10) === ctx.today);
      return {
        intent: "calendar",
        source: "DATABASE_QUERY",
        text: todays.length ? `You have ${todays.length} event${todays.length > 1 ? "s" : ""} today:` : "Nothing scheduled today.",
        items: todays.map((e) => ({ label: e.title, detail: `${formatKlTime(e.start)}–${formatKlTime(e.end)}${e.location ? ` · ${e.location}` : ""}`, href: "/calendar" })),
      };
    },
  },
  {
    intent: "weekly_report",
    match: /\b(weekly|week)\b.*\breport\b|\breport\b.*\bweek(ly)?\b|\blaporan mingguan\b/i,
    handle: (ctx) =>
      can(ctx.user.role, "reports:generate")
        ? nav("weekly_report", "/reports?draft=weekly", "Opening Reports with a draft weekly report built from current data. It's marked DRAFT until reviewed.")
        : { intent: "weekly_report", source: "LOCAL_COMMAND", text: "Your role can view reports but not generate drafts." },
  },
  {
    intent: "mission",
    match: /\b(mission|vision|misi|visi|strategy|strategic goals?)\b/i,
    handle: (ctx) =>
      ctx.strategy
        ? {
            intent: "mission",
            source: "DATABASE_QUERY",
            text: `Mission: ${ctx.strategy.mission}`,
            items: [{ label: `Vision: ${ctx.strategy.vision}` }, { label: `Company tagline: “${ctx.strategy.tagline}”` }],
            navigate: "/mission",
          }
        : { intent: "mission", source: "LOCAL_COMMAND", text: "Mission data isn't available for your role." },
  },
  { intent: "open_research", match: /\b(open|show|go to)\b.*\b(research|library|literature|standards?)\b/i, handle: () => nav("open_research", "/research", "Opening the Research Knowledge Centre.") },
  { intent: "open_content", match: /\b(open|show|go to)\b.*\b(content|factory|tiktok)\b/i, handle: () => nav("open_content", "/content-factory", "Opening the AI Content Factory.") },
  { intent: "open_grants", match: /\b(open|show|go to)\b.*\b(grants?|funding)\b/i, handle: () => nav("open_grants", "/grants", "Opening Research Grants.") },
  { intent: "open_tasks", match: /\b(open|show|go to)\b.*\b(tasks?|my day)\b/i, handle: () => nav("open_tasks", "/tasks", "Opening your tasks.") },
  { intent: "open_tv", match: /\b(open|show|go to)\b.*\b(tv|display)\b/i, handle: () => nav("open_tv", "/tv", "Opening the TV display.") },
  {
    intent: "time",
    match: /\b(what('s| is) the )?(time|date|day) (is it|today)\b|\bwhat time\b|\btoday'?s date\b/i,
    handle: (ctx) => ({
      intent: "time",
      source: "LOCAL_COMMAND",
      text: `It's ${new Intl.DateTimeFormat("en-MY", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(ctx.now)} (Malaysia time).`,
    }),
  },
];

export function interpret(message: string, ctx: AssistantContext): AssistantReply {
  const raw = message.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!raw) return { intent: "empty", source: "LOCAL_COMMAND", text: "Say or type a command. Try “help”." };
  // Greeting combined with a request ("good morning, what are my priorities") → prefer the request.
  const matches = RULES.filter((r) => r.match.test(raw));
  const chosen = matches.find((r) => r.intent !== "greeting" && r.intent !== "help") ?? matches[0];
  if (chosen) return chosen.handle(ctx, raw.match(chosen.match)!, raw);
  return {
    intent: "unrecognised",
    source: "UNRECOGNISED",
    text: "I didn't recognise that command. AURA v1 uses local rules only — no external AI model is connected. Type “help” for what I can do.",
  };
}
