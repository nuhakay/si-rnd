# Architecture

## Layers

```
Browser (desktop · mobile · Smart TV)
   │  HTTPS, HttpOnly session cookie
   ▼
proxy.ts ──────────────── rejects requests without a validly-signed session cookie
   │
   ├─ Presentation      src/app/**/page.tsx (React Server Components), src/components/**
   │                     Client components only where interaction is needed
   │                     (VoiceCommandPanel, TaskBoard, ContentApprovalPanel, TVDashboard…)
   │
   ├─ API routes        src/app/api/**/route.ts  — parse + validate (Zod), authorise, call logic
   │
   ├─ Authentication    src/lib/auth/*           — scrypt hashing, HMAC-signed session ids, revocable sessions
   ├─ Authorisation     src/lib/permissions      — RBAC matrix (default deny) + classification clearance
   ├─ Application logic src/lib/content/workflow (approval state machine), src/lib/assistant/engine (AURA rules)
   ├─ Data access       src/lib/data/repo        — every query takes the acting user and filters by role/clearance
   ├─ Persistence       src/lib/data/store       — DataStore interface; JSON-file adapter (atomic writes)
   ├─ Integrations      src/lib/integrations     — registry + AIProvider interface; all OFF by default
   └─ Audit             src/lib/audit            — append-only JSON-lines log
```

Rules that keep it secure:

1. **Pages and API routes never read the store directly for user-facing data** — they go through `repo.ts`, which applies role and classification filters. (Exceptions: the login route reads users; settings reads counts for ADMIN only.)
2. **Every page** calls `requirePageUser(permission)`; **every API route** calls `requireApiUser(req, permission)` which also performs the CSRF Origin check for mutations.
3. Content workflow permissions are checked inside the pure `applyContentAction()` so they cannot be bypassed by a different route.
4. The TV display uses a dedicated `getTvSnapshot()` that **whitelists** fields — it never serialises whole records.

## AURA assistant

`interpret(message, context)` is a pure function: regex intent rules → reply. The API route builds the context from `repo.ts`, so the assistant can only “see” what the signed-in user can see. Replies carry `source`:

| source | meaning |
|---|---|
| `LOCAL_COMMAND` | handled in-app (navigation, time, help) |
| `DATABASE_QUERY` | answered from live application data |
| `EXTERNAL_AI` | reserved — only when an AI provider is explicitly enabled and implemented |
| `UNRECOGNISED` | no rule matched; the app says so rather than inventing an answer |

Voice: browser `SpeechRecognition` (push-to-talk, `continuous=false`; never always-on) and `speechSynthesis` for optional read-aloud. Unsupported browsers fall back to text.

To add an external model later: implement `AIProvider` in `src/lib/integrations/ai.ts`, call it from the assistant route only for `UNRECOGNISED` intents, send only data the user is cleared for (never CONFIDENTIAL/RESTRICTED), and label replies `EXTERNAL_AI`.

## Content approval state machine

```
TOPIC_RESEARCH [DRAFT]
  └─submit──▶ SCIENTIFIC_FACT_CHECKING [FACT_CHECK]
        └─PASS (reviewer ≠ author)──▶ PNC_CONFIDENTIALITY_SCREENING [PNC_REVIEW]
              └─PASS (R&D_MANAGER/ADMIN, ≠ author)──▶ SCRIPT → STORYBOARD → VOICE_OVER → VIDEO_PRODUCTION → FINAL_REVIEW [DRAFT, cleared]
                    └─advance──▶ HUMAN_APPROVAL [READY_FOR_APPROVAL]
                          └─approve (≠ author)──▶ TIKTOK_PUBLISHING [APPROVED]
                                └─record manual post URL──▶ PERFORMANCE_ANALYTICS [PUBLISHED]
FAIL at any check → REVISION_REQUIRED (records cleared on resubmission). REJECT available to approvers.
```

## Swapping the data backend

`DataStore` (`read()`, `update(mutator)`) is the only persistence contract. To move to Postgres/SQLite/Google Sheets:

1. Implement a new adapter (e.g. `src/lib/data/sql-store.ts`).
2. Return it from `getStore()` based on an env flag.
3. For a relational DB, it is better to re-implement the functions in `repo.ts` with real queries; their signatures (user in, filtered data out) stay the same, so no UI changes are needed.

Google Sheets is suitable only for **low-risk operational data** (e.g. the content idea list), accessed **server-side** with a service account — never published or shared publicly, and never for CONFIDENTIAL/RESTRICTED records.

## Performance notes

- AURA core, rings, particles and waveform are SVG + CSS keyframes (GPU-friendly transforms); no `requestAnimationFrame` loops, no WebGL/3D.
- `html[data-motion="low"]` (toggle, `?motion=low`, or OS reduce-motion) disables all animations and backdrop blur for TVs/low-power devices.
- Server Components render most of the UI; client JS is limited to interactive widgets. Recharts is only loaded on project detail pages.
- Fonts are self-hosted via `@fontsource-variable` (Inter, Space Grotesk, JetBrains Mono — SIL OFL).
