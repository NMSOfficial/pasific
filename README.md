# Pasific

Pasific is a role-based English writing platform for students, teachers and platform administrators. The frontend is a React/Vite single-page application, Supabase provides authentication and the primary PostgreSQL database, and a Railway-hosted Express service performs privileged operations such as AI grading, password recovery and account deletion.

## Architecture

```text
Browser / Vercel SPA
  ├─ Supabase Auth
  ├─ Supabase PostgREST protected by RLS
  └─ Railway Express API
       ├─ Gemini grading
       ├─ trusted service-role persistence
       └─ Resend password-recovery email
```

Roles are `student`, `teacher` and `super_admin`. Browser route guards are for user experience only; authorization must also be enforced by PostgreSQL RLS, database triggers and Railway endpoint checks.

## Requirements

- Node.js 22.12 or newer, below Node 25
- npm
- A Supabase project
- A Gemini API key
- A verified Resend sending domain

## Local setup

```bash
npm ci
cp .env.example .env
npm run dev:all
```

The Vite frontend runs on its configured development port and the Express API defaults to port `8787`.

## Environment variables

Frontend variables are exposed at build time and must never contain secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
```

Railway runtime variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
APP_ORIGIN
CORS_ORIGIN
```

`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` and `RESEND_API_KEY` must be runtime-only secrets. Do not put them in Vite variables, source control, Docker build arguments or logs.

## Quality checks

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Pull requests to `main` run the same checks in GitHub Actions. Production deployment should not proceed while a required check is failing.

## Database migrations

SQL migrations live in `supabase/migrations` and must be applied in numeric order. All production schema changes must use the Supabase migration mechanism so drift can be detected.

Security-sensitive migration order for the August 2026 hardening:

1. `0033_security_hotfix_phase1.sql`
2. Deploy the Railway and Vercel code that persists grading on the server.
3. `0034_submission_write_hardening.sql`

Do not apply step 3 before the new Railway grading endpoint is available, because older frontend code writes AI results directly from the browser.

After every DDL change, run Supabase security and performance advisors and verify that no new public `SECURITY DEFINER` RPC or broad write policy has been introduced.

## Deployment

### Vercel

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Runtime: Node 22 or 24

### Railway

- Source branch: `main`
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check: `/health`
- Runtime: Node 22 or 24

The frontend's `VITE_API_URL` must point to the Railway public domain. Railway's `CORS_ORIGIN` must contain the exact production Vercel origin and any intentional custom frontend domains.

## Resend setup

`RESEND_FROM_EMAIL` must use a verified Resend domain. Configure DKIM, SPF/MX and SPF/TXT records exactly as shown in Resend, trigger verification, then perform a real password-recovery delivery test. Use one restricted sending API key for Railway and revoke unused or unrestricted keys after rotation.

Password recovery links, recipient addresses, bearer tokens and API keys must never be logged.

## Authorization rules

- Users may edit only their own safe profile fields.
- Role, account status, school membership and expiry are server/admin managed.
- Students may edit draft text and submit it, but may not write AI scores, annotations, recommendations or teacher feedback.
- Teachers may review submissions for linked schools and change only teacher-owned review fields.
- AI grading output is persisted only by the Railway service-role backend.
- Rubrics are writable only by super admins or teachers with `create_assignments` permission.

## Incident response

For suspected credential or authorization exposure:

1. Disable the affected endpoint or account path.
2. Rotate the relevant Supabase service-role, Gemini and Resend credentials.
3. Inspect Supabase auth/API logs and application audit events.
4. Check profile role/status/school/expiry changes and score/review mutations.
5. Redeploy from a known-good `main` commit.
6. Record the remediation as a numbered migration and post-incident note.

## Backup and recovery

Before destructive migrations, confirm that a recent Supabase database backup is available. Test restoration in an isolated project or branch. Application rollback and database rollback are separate operations; avoid irreversible data migrations unless a tested recovery path exists.
