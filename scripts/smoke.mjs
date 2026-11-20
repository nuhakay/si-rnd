#!/usr/bin/env node
/**
 * End-to-end smoke test against a RUNNING server (dev or production).
 *   BASE_URL=http://localhost:3000 DEMO_PASSWORD='Aura#Demo2026' npm run smoke
 * Exercises authentication, role permissions, PNC classification, CSRF,
 * content-approval gates, TV sanitisation and security headers.
 * Run against a fresh DATA_DIR: it creates tasks and content items.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = process.env.DEMO_PASSWORD || "Aura#Demo2026";
let pass = 0, fail = 0;

function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

async function req(path, { method = "GET", cookie, body, origin = BASE, redirect = "manual" } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (origin && method !== "GET") headers.origin = origin;
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, headers: res.headers, json, text };
}

async function login(username, password = PW, ip = undefined) {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(ip ? { "x-forwarded-for": ip } : {}) },
    body: JSON.stringify({ username, password }),
  });
  const set = res.headers.get("set-cookie") || "";
  const m = set.match(/sia_session=([^;]+)/);
  return { status: res.status, cookie: m ? `sia_session=${m[1]}` : null, json: await res.json().catch(() => null), setCookie: set };
}

console.log(`Smoke testing ${BASE}\n`);

console.log("Unauthenticated access");
check("dashboard redirects to /login", [302, 307, 308].includes((await req("/dashboard")).status));
check("API returns 401", (await req("/api/tasks")).status === 401);
check("TV API returns 401", (await req("/api/tv")).status === 401);
check("forged cookie rejected", (await req("/api/tasks", { cookie: "sia_session=abc.def" })).status === 401);
check("health endpoint public", (await req("/api/health")).status === 200);

console.log("Security headers");
const h = (await req("/login")).headers;
check("CSP set", (h.get("content-security-policy") || "").includes("frame-ancestors 'none'"));
check("X-Frame-Options DENY", h.get("x-frame-options") === "DENY");
check("nosniff", h.get("x-content-type-options") === "nosniff");
check("no X-Powered-By", !h.get("x-powered-by"));

console.log("Authentication");
const bad = await login("admin", "wrong-password", "10.0.0.9");
check("wrong password → 401", bad.status === 401);
let limited = false;
for (let i = 0; i < 6; i++) if ((await login("viewer", "nope", "10.0.0.77")).status === 429) limited = true;
check("login rate-limited after repeated failures", limited);
const crossSite = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ username: "admin", password: PW }) });
check("cross-origin login blocked", crossSite.status === 403);

const S = {};
for (const u of ["admin", "manager", "engineer", "viewer", "tv"]) {
  const r = await login(u);
  S[u] = r.cookie;
  check(`${u} can sign in`, r.status === 200 && !!r.cookie, `status=${r.status}`);
  if (u === "admin") check("session cookie is HttpOnly + SameSite=Lax", /HttpOnly/i.test(r.setCookie) && /SameSite=lax/i.test(r.setCookie));
}

console.log("Page access by role");
for (const p of ["/dashboard", "/my-day", "/projects", "/tasks", "/calendar", "/research", "/grants", "/mission", "/content-factory", "/assistant", "/reports", "/settings", "/tv"]) {
  const r = await req(p, { cookie: S.admin });
  check(`admin ${p} → 200`, r.status === 200, `got ${r.status}`);
}
const tvDash = await req("/dashboard", { cookie: S.tv });
check("TV role redirected away from dashboard", [302, 307, 308].includes(tvDash.status) && (tvDash.headers.get("location") || "").includes("/tv"));
check("TV role can open /tv", (await req("/tv", { cookie: S.tv })).status === 200);
const vr = await req("/reports", { cookie: S.viewer });
check("management viewer can open reports", vr.status === 200);

console.log("API permissions");
check("TV cannot read tasks", (await req("/api/tasks", { cookie: S.tv })).status === 403);
check("TV cannot use assistant", (await req("/api/assistant", { method: "POST", cookie: S.tv, body: { message: "hi" } })).status === 403);
check("viewer can read tasks", (await req("/api/tasks", { cookie: S.viewer })).status === 200);
check("viewer cannot create tasks", (await req("/api/tasks", { method: "POST", cookie: S.viewer, body: { title: "x" } })).status === 403);
check("viewer cannot generate reports", (await req("/api/reports/weekly", { cookie: S.viewer })).status === 403);
check("engineer can generate report draft", (await req("/api/reports/weekly", { cookie: S.engineer })).json?.markdown?.includes("DRAFT"));

console.log("CSRF / validation");
check("mutation without Origin blocked", (await req("/api/tasks", { method: "POST", cookie: S.engineer, body: { title: "x" }, origin: null })).status === 403);
check("mutation from foreign Origin blocked", (await req("/api/tasks", { method: "POST", cookie: S.engineer, body: { title: "x" }, origin: "https://evil.example" })).status === 403);
check("invalid task rejected (422)", (await req("/api/tasks", { method: "POST", cookie: S.engineer, body: { title: "", priority: "URGENT" } })).status === 422);
check("mass-assignment field rejected", (await req("/api/tasks/00000000-0000-4000-8000-000000000000", { method: "PATCH", cookie: S.engineer, body: { ownerId: "x" } })).status === 422);

console.log("Task lifecycle");
const created = await req("/api/tasks", { method: "POST", cookie: S.engineer, body: { title: "Smoke test task", priority: "HIGH", dueDate: "2030-01-01" } });
check("create task → 201", created.status === 201);
const tid = created.json?.task?.id;
check("complete task", (await req(`/api/tasks/${tid}`, { method: "PATCH", cookie: S.engineer, body: { status: "DONE" } })).json?.task?.status === "DONE");
check("reschedule task", (await req(`/api/tasks/${tid}`, { method: "PATCH", cookie: S.engineer, body: { dueDate: "2030-02-02", status: "TODO" } })).json?.task?.dueDate === "2030-02-02");
const mgrTask = await req("/api/tasks", { method: "POST", cookie: S.manager, body: { title: "Manager-only task" } });
check("engineer cannot edit manager's task", (await req(`/api/tasks/${mgrTask.json?.task?.id}`, { method: "PATCH", cookie: S.engineer, body: { status: "DONE" } })).status === 404);
check("delete task", (await req(`/api/tasks/${tid}`, { method: "DELETE", cookie: S.engineer })).status === 200);

console.log("PNC classification");
const all = (await req("/api/projects", { cookie: S.admin })).json.projects;
const npi = all.find((p) => p.classification === "RESTRICTED");
const chm = all.find((p) => p.code === "CHM");
check("engineer cannot open RESTRICTED project", (await req(`/api/projects/${npi.id}`, { cookie: S.engineer })).status === 404);
check("manager can open RESTRICTED project", (await req(`/api/projects/${npi.id}`, { cookie: S.manager })).status === 200);
check("viewer cannot open CONFIDENTIAL project", (await req(`/api/projects/${chm.id}`, { cookie: S.viewer })).status === 404);
const engList = (await req("/api/projects", { cookie: S.engineer })).json;
check("engineer list hides restricted", !engList.projects.some((p) => p.classification === "RESTRICTED") && engList.hiddenCount >= 1);
const pageNpi = await req(`/projects/${npi.id}`, { cookie: S.engineer });
check("restricted project page → 404 for engineer", pageNpi.status === 404);

console.log("TV snapshot sanitisation");
const tv = (await req("/api/tv", { cookie: S.tv })).json;
const tvText = JSON.stringify(tv);
check("TV snapshot has projects", tv?.projects?.length > 0);
check("no personnel / descriptions / risks", !/personnel|description|risks|mitigation|Demo Engineer|ownerId/i.test(tvText));
check("tvVisible=false project excluded", !tv.projects.some((p) => p.code === "NPI"));

console.log("AURA assistant");
const ask = async (m, who = "engineer") => (await req("/api/assistant", { method: "POST", cookie: S[who], body: { message: m } })).json?.reply;
check("priorities → live data", (await ask("What are my priorities today?"))?.source === "DATABASE_QUERY");
check("Chameleon progress", /Chameleon/.test((await ask("Show Chameleon project progress"))?.text || ""));
check("restricted project not revealed to engineer", !/New Product Innovation/.test(JSON.stringify(await ask("Show New Product Innovation project progress"))));
check("unknown → no fake AI", (await ask("tell me a joke"))?.source === "UNRECOGNISED");

console.log("Content approval workflow");
const c = (await req("/api/content", { method: "POST", cookie: S.engineer, body: { title: "Smoke content", hook: "Hook", language: "BM" } })).json.item;
const act = (who, body) => req(`/api/content/${c.id}`, { method: "POST", cookie: S[who], body });
check("cannot publish a draft", (await act("manager", { action: "RECORD_PUBLISHED", url: "https://www.tiktok.com/@x/video/1" })).status === 409);
check("engineer submits for fact-check", (await act("engineer", { action: "SUBMIT_FOR_FACT_CHECK" })).status === 200);
check("author cannot fact-check own content", (await act("engineer", { action: "RECORD_FACT_CHECK", decision: "PASS" })).status === 403);
check("viewer cannot fact-check", (await act("viewer", { action: "RECORD_FACT_CHECK", decision: "PASS" })).status === 403);
check("manager fact-check PASS", (await act("manager", { action: "RECORD_FACT_CHECK", decision: "PASS" })).status === 200);
check("engineer cannot PNC-screen", (await act("engineer", { action: "RECORD_PNC_SCREENING", decision: "PASS" })).status === 403);
check("manager PNC PASS", (await act("manager", { action: "RECORD_PNC_SCREENING", decision: "PASS" })).status === 200);
for (let i = 0; i < 5; i++) await act("engineer", { action: "ADVANCE_STAGE" });
check("cannot publish before approval", (await act("manager", { action: "RECORD_PUBLISHED", url: "https://www.tiktok.com/@x/video/1" })).status === 409);
check("engineer cannot approve", (await act("engineer", { action: "APPROVE" })).status === 403);
const appr = await act("manager", { action: "APPROVE", notes: "smoke" });
check("manager approves", appr.json?.item?.status === "APPROVED" && appr.json?.item?.approval?.reviewerName);
const pub = await act("manager", { action: "RECORD_PUBLISHED", url: "https://www.tiktok.com/@x/video/1" });
check("publication recorded after all gates", pub.json?.item?.status === "PUBLISHED");

console.log("Audit & logout");
const settings = await req("/settings", { cookie: S.admin });
check("audit log visible to admin", settings.text.includes("PERMISSION_DENIED") && settings.text.includes("CONTENT_APPROVE"));
const lo = await req("/api/auth/logout", { method: "POST", cookie: S.viewer });
check("logout ok", lo.status === 200);
check("revoked session no longer works", (await req("/api/tasks", { cookie: S.viewer })).status === 401);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
