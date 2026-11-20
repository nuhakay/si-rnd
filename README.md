# SI ACOUSTIC | R&D COMMAND CENTRE

Private, voice-enabled R&D productivity and project command centre for **SI Acoustic Sdn Bhd — Research & Development**, with the **AURA** (Acoustic Unified Research Assistant) interface.

- Proposed domain: `https://rnddepartment-dashboard.siacoustic.com`
- Timezone: Asia/Kuala_Lumpur (all dates/times are MYT)
- Works on Windows/Mac browsers, phones, tablets and Smart TVs (`/tv`)

> ⚠️ **All seeded records are DEMONSTRATION data** (flagged `isDemo` and shown with a *DEMO* badge). Names, dates and percentages are placeholders. No certifications, research results, expenditure or management approvals are claimed.

---

## Quick start (local)

Requirements: **Node.js 20.9+** (tested on Node 22).

```bash
npm install
cp .env.example .env.local      # optional in development
npm run dev                     # http://localhost:3000
```

Sign in with a development demo account (password **`Aura#Demo2026`** unless `SEED_DEMO_PASSWORD` is set):

| Username   | Role               | What they can do |
|------------|--------------------|------------------|
| `admin`    | ADMIN              | Everything, incl. audit log & settings |
| `manager`  | R&D_MANAGER        | All R&D data incl. RESTRICTED, PNC screening, approve & publish content |
| `engineer` | R&D_ENGINEER       | Own tasks, CONFIDENTIAL data, fact-check content, draft reports |
| `viewer`   | MANAGEMENT_VIEWER  | Read-only, INTERNAL data, reports |
| `tv`       | TV_VIEWER          | `/tv` sanitised display only |

The data store is created on first run in `./.data/db.json` (JSON file) with an append-only `./.data/audit.log`. Delete `.data/` to reset the demo.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (57 tests) |
| `npm run smoke` | End-to-end smoke test against a running server (75 checks) |
| `npm run check` | lint + typecheck + test + build |

Smoke test against a production build:

```bash
npm run build
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))") \
SEED_DEMO_PASSWORD='Choose#A#Strong#One' DATA_DIR=/tmp/sia-smoke APP_ORIGIN=http://localhost:3100 \
npx next start -p 3100 &
BASE_URL=http://localhost:3100 DEMO_PASSWORD='Choose#A#Strong#One' npm run smoke
```

## Verified status (this build)

Executed on 20 Nov 2026 in the build environment:

- `npm run lint` — 0 errors, 0 warnings
- `npm run typecheck` — passed
- `npm test` — 57/57 passed (RBAC, classification, auth, validation, content workflow, data layer, TV sanitisation, AURA)
- `npm run build` — passed (Next.js 16.4.6, Turbopack), 0 warnings
- `npm run smoke` against `next start` — 75/75 passed
- Headless Chrome screenshots at 1920×1080, 3840×2160 (TV) and 390×844 (mobile): no console errors, no horizontal overflow on any page

Not tested here: real microphone input (needs a physical device), Safari/iOS and actual Smart-TV browsers, HTTPS deployment.

## Completed vs pending

### Completed (MVP)
- JARVIS-inspired original HUD design system (SVG/CSS only), animated **AURA core**, rotating rings, listening ping, waveform, particles, grid, low-motion mode + `prefers-reduced-motion`
- Desktop 16:9 command-centre layout (left nav · centre AURA · right deadlines/projects/notifications · bottom KPIs/timeline/reporting/activity)
- Mobile layout with bottom navigation (no horizontal overflow)
- **Smart TV** `/tv` (1080p & 4K responsive, fullscreen, 60 s auto-refresh, offline fallback, sanitised data only)
- **Daily Command Centre** (My Day): schedule, top-3 priorities, meetings, overdue, research deadlines, achievements, private quick notes
- **Tasks**: create, complete, reopen, reschedule, status board, delete, dependency blocking
- **Project portfolio** + detail pages (stage, milestones, personnel, risks, dependencies, documents, approval history, progress chart, strategic alignment)
- **Mission & Vision**: mission/vision (DRAFT), annual & long-term goals with KPIs/owners, 5-year roadmap, project↔objective alignment matrix
- **Research Knowledge Centre**: literature, summaries, standards register, lab schedule, approved reports, version history, search & filters, PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED enforced server-side
- **Research Grants** tracker
- **AI Content Factory**: 11-stage pipeline, ideas/hooks (BM/EN), storyboards, narration/Canva status, approval states, fact-check → PNC → human approval gates with reviewer/date records, separation of duties, manual publication recording
- **AURA assistant**: text + push-to-talk voice (Web Speech API, EN/BM), mic-permission & unsupported-browser fallbacks, optional read-aloud, command history, quick actions; every reply labelled *Local command* / *Live data query* / *External AI*
- **Weekly report draft** generator (Markdown, copy/download, marked DRAFT)
- **Security**: scrypt passwords, signed revocable sessions, HttpOnly/SameSite cookies, RBAC default-deny, server-side classification filtering, CSRF origin checks, rate-limited login, Zod validation, security headers/CSP, audit log, secrets via env
- Docs: ARCHITECTURE, SECURITY, DEPLOYMENT (incl. domain guide)

### Pending / not yet implemented
- Real company data entry UI for projects, documents, grants, objectives (currently seed + API reads; tasks/notes/content are editable)
- User management UI (create users, reset passwords, disable accounts) and forced password change
- MFA / SSO (recommended: put Cloudflare Access or Google Workspace SSO in front — see DEPLOYMENT.md)
- Managed database adapter (Postgres/SQLite) or Google Sheets adapter — interface ready (`DataStore`)
- Google Calendar sync (status shown as *not connected*)
- External AI provider for AURA (interface only; nothing paid is enabled)
- ElevenLabs narration API, Canva, TikTok posting & analytics APIs (statuses tracked manually)
- File upload/storage for research documents
- Nonce-based CSP, shared rate-limit store for multi-instance hosting
- Browser E2E tests (Playwright) in CI; Smart-TV device testing

## Project structure

```
src/
  app/                 Routes (App Router)
    (app)/             Authenticated shell: dashboard, my-day, projects, tasks, calendar,
                       research, grants, mission, content-factory, assistant, reports, settings
    tv/                Smart TV display
    login/             Sign-in
    api/               Route handlers (auth, tasks, notes, assistant, content, projects, reports, tv, health)
  components/
    ai/                AIOrb, VoiceCommandPanel
    dashboard/         KPIWidget, ProjectStatusCard, TaskBoard, CalendarTimeline, MissionTracker,
                       NotificationPanel, DeadlineList, QuickNotes
    charts/            ProgressRing, ProgressChart (Recharts), ProjectTimeline
    modules/           ResearchLibrary, ContentApprovalPanel, ReportDraft, TVDashboard
    layout/            HolographicPanel, LiveClock, MotionToggle, Particles
    navigation/        Sidebar, MobileNav
    ui/                Badges, buttons, headers
  lib/
    auth/              password (scrypt), token (HMAC), session, rate-limit
    permissions/       RBAC matrix + classification clearance
    data/              store (DataStore interface, JSON adapter), repo (role-aware queries), seed
    content/           approval workflow state machine
    assistant/         AURA rule engine
    integrations/      integration registry, AI provider interface
    validation/        Zod schemas
  proxy.ts             Edge-of-app auth gate (Next 16 "proxy", formerly middleware)
  types/               Domain types
tests/                 Vitest unit tests
scripts/smoke.mjs      End-to-end smoke test
```
