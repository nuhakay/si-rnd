# Security — PNC protection

The command centre may eventually hold proprietary SI Acoustic R&D information. This document describes the controls implemented, how they were tested, and what must be done before production.

## Implemented controls

| Control | Implementation |
|---|---|
| Private authenticated access | All routes except `/login`, `/api/auth/login`, `/api/health` require a session (`src/proxy.ts` + server checks) |
| Password storage | scrypt (N=16384, r=8, p=1, 16-byte salt), constant-time compare; dummy hash for unknown users |
| Sessions | 256-bit random id, HMAC-SHA256 signed cookie, stored server-side with expiry (default 12 h), revoked on logout |
| Cookies | `HttpOnly`, `SameSite=Lax`, `Secure` in production |
| CSRF | Mutating API requests must carry an `Origin` equal to the app origin (or `APP_ORIGIN`) |
| Brute force | Login limited to 5 attempts / 15 min per IP+user and 20 / 15 min per user |
| Role-based permissions | `src/lib/permissions` — explicit allow-list per role; unknown role/permission = deny |
| Classification (PNC) | PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED; clearance: TV=PUBLIC, Management=INTERNAL, Engineer=CONFIDENTIAL, Manager/Admin=RESTRICTED. Filtering happens in `repo.ts` on the server; hidden items are counted, never sent |
| TV display | `TV_VIEWER` can only call `/api/tv`, which returns a field whitelist (no names, descriptions, risks, documents, costs) and only `tvVisible` projects |
| Input validation | Zod schemas, strict objects (no mass assignment), length limits, control-char stripping, 32 KB body limit, JSON content-type required |
| Content publishing gate | No item reaches PUBLISHED without PASS fact-check, PASS PNC screening and APPROVED human decision, each recording reviewer + timestamp; authors cannot review/approve their own content |
| Audit logging | Logins (success/failure/rate-limited), logouts, permission denials, CSRF blocks, task/content changes, report drafts, denied project reads → `DATA_DIR/audit.log` (0600) |
| Security headers | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (mic = self only), COOP, HSTS in production, no `X-Powered-By` |
| Secrets | Environment variables only (`.env.example`); `.env*` git-ignored; production refuses to start sessions without `SESSION_SECRET` and refuses to seed demo users without `SEED_DEMO_PASSWORD` |
| Search engines | `robots: noindex, nofollow` |
| Microphone | Push-to-talk only; recognition stops after each utterance; never always-on |
| Paid APIs | None enabled. Integrations report *not connected* until explicitly configured and implemented |

## Tests

- `tests/permissions.test.ts`, `tests/auth.test.ts`, `tests/validation.test.ts`, `tests/workflow.test.ts`, `tests/data-layer.test.ts`, `tests/assistant.test.ts` — 57 unit tests.
- `scripts/smoke.mjs` — 75 end-to-end checks against a running production build: unauthenticated access, forged cookies, headers, rate limiting, cross-origin login, page/API access per role, CSRF, validation, mass assignment, task ownership, RESTRICTED/CONFIDENTIAL access, TV sanitisation, assistant leakage, the full content approval chain, audit visibility, session revocation.

## Must do before production

1. **Replace demo accounts.** Set a strong `SEED_DEMO_PASSWORD` for first boot only, then create real accounts and disable/delete the demo users (user-management UI is pending — edit `db.json` while the server is stopped, using `hashPassword()` to generate hashes, or add the admin UI first).
2. Set `SESSION_SECRET` (≥ 32 random chars) and `APP_ORIGIN=https://rnddepartment-dashboard.siacoustic.com`.
3. Serve **only over HTTPS**. Put the app behind a reverse proxy/tunnel that sets `X-Forwarded-For` (the rate limiter trusts it).
4. Put an identity layer in front (recommended): Cloudflare Access or Google Workspace SSO with MFA, restricted to `@siacoustic.com` accounts. This adds MFA without code changes.
5. Store `DATA_DIR` on an encrypted, backed-up, non-public volume. Back up `db.json` and `audit.log` daily; ship the audit log off-host if possible.
6. Do **not** enter proprietary formulations, manufacturing parameters, costing, customer contracts, unpublished results or staff personal data until steps 1–5 are done and the classification of each record has been reviewed.
7. Mark projects `tvVisible` deliberately — the TV is in a shared space.

## Hardening backlog

- Nonce-based CSP (remove `'unsafe-inline'` for scripts).
- Shared rate-limit/session store when running more than one instance.
- Optional: approver must differ from PNC reviewer (currently only “≠ author” is enforced).
- Account lockout notifications, password policy, forced rotation of seeded passwords.
- Field-level encryption for RESTRICTED records.
- Automated dependency scanning (`npm audit` in CI) and Playwright E2E in CI.

## Reporting a vulnerability

Contact the R&D system administrator directly. Do not post details in shared channels.
