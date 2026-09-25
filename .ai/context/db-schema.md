---
owner: data-steward
sources:
  - apps/api/src/database/**
  - apps/api/drizzle/**
  - docs/schema.dbml
verified_at: 28e5aec
---
# Database (Postgres + Drizzle) — context card

## Key files
| Path | Purpose |
|---|---|
| apps/api/src/database/schema/*.ts | Drizzle table definitions (source of truth for code) |
| apps/api/drizzle/*.sql, meta/ | generated migrations — never hand-edit meta/ |
| apps/api/drizzle.config.ts | drizzle-kit config |
| docs/schema.dbml | target model from the RFC (may be ahead of code) |

## Tables (as of verified_at)
| Table | Notes |
|---|---|
| users | unique email, unique slug, preferences jsonb |
| user_identities | provider (email/google) + account id unique; FK users cascade |
| tenants | unique slug, status; every operational row will reference it (RN-02) |
| tenant_memberships | unique (user_id, tenant_id) |
| refresh_tokens | token_hash, family_id (rotation/reuse detection) |
| email_verifications | email, expires_at |
| password_reset_tokens | token_hash, FK users |
| login_attempts | unique email, locked_until |
| user_consents | (user_id, document) |
| _rls_probe | **test-fixture only, not a domain table** (JOA-19). tenant_id → tenants cascade; RLS enabled+forced; no repository ever reads/writes it. |
Enums: record_status, tenant_plan (free/pro/enterprise), auth_provider (email/google), consent_document.

## Conventions
- snake_case columns, `idx_<table>_<cols>` index names, FK to users/tenants with onDelete cascade.
- New tenant-scoped tables: `tenant_id` NOT NULL + index; RLS via `apps/api/src/database/schema/rls.ts`.

### RLS pattern (JOA-19)
Every tenant-scoped table:
```ts
(table) => [index('idx_<table>_tenant_id').on(table.tenantId), tenantIsolationPolicy('<table>')]
).enableRLS();
```
`tenantIsolationPolicy` (in `rls.ts`) applies `USING/WITH CHECK tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid` — fails closed (0 rows) when the session var is unset **or** was reset to `''` (Postgres resets a previously-set custom GUC to `''`, not NULL, on commit/rollback of a reused pooled connection — the bare cast without `nullif` errors instead of returning 0 rows in that case; see `.ai/work/JOA-19/answers.md` #5). `.enableRLS()` emits `ENABLE ROW LEVEL SECURITY` via drizzle-kit; drizzle-kit does **not** emit `FORCE ROW LEVEL SECURITY` — hand-append `ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;` to the generated migration `.sql` every time (see `0001_rls_probe.sql`). Without FORCE, the table owner/migration role bypasses RLS silently.
API side sets the session var per-transaction via `select set_config('app.current_tenant', $1, true)` (see `.ai/work/JOA-19/db.md`).

### DB role model (JOA-19)
Two roles, two env vars — never merge them:
| Role | Env var | Used by | Privileges |
|---|---|---|---|
| owner/migration role | `DATABASE_URL` | drizzle-kit migrations only | table owner; **bypasses RLS** (owner always does, even with FORCE) |
| `planici_app` (runtime role) | `DATABASE_URL_APP` | app's runtime pool (queries) | `SELECT/INSERT/UPDATE/DELETE` + sequence `USAGE` only; `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`; owns no tables → subject to `FORCE ROW LEVEL SECURITY` |
`env.schema.ts`: `DATABASE_URL_APP` optional in dev (falls back to `DATABASE_URL`), **required in production** (fail-closed superRefine, `apps/api/src/config/env.schema.ts:101`).
Provisioning runbook (Neon `CREATE ROLE planici_app ...` + grants): `.ai/work/JOA-19/platform.md`.
**Resolved (JOA-19, 2026-09-25):** owner ran the full `platform.md` runbook in Neon (role creation, grants, default privileges, verification) and set `DATABASE_URL` + `DATABASE_URL_APP`; `planici_app` is provisioned and RLS is enforced end-to-end in production. N8/AC6 are closed — see `.ai/work/JOA-19/answers.md` #7. Note: deploy is moving to ECS Fargate (answers #10); per that plan only the migration task receives `DATABASE_URL` (JOA-43).
**Versioned script (JOA-39):** `apps/api/src/database/bootstrap/app-role.sql` is the same runbook as an idempotent, parameterized `.sql` file — NOT a drizzle-kit migration (outside `apps/api/drizzle/`, drizzle-kit never tracks it). Run with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v app_role=<name> -v app_password=<pw> -f apps/api/src/database/bootstrap/app-role.sql`, as the owner/migration role, once per database/branch (local compose migrate service, each Neon branch). Safe to run repeatedly (verified twice against a throwaway `postgres:17` container: role create-or-alter, grants, and `ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER` all idempotent; `rolsuper`/`rolbypassrls` confirmed `f`, 0 owned tables, DML works on both pre-existing and post-bootstrap tables). See `.ai/work/JOA-39/db.md`.

## Gotchas
- No `db:generate` / `db:migrate` scripts in apps/api/package.json yet (use `pnpm --filter api exec drizzle-kit …`).
- `docs/schema.dbml` targets the *product* domain model only — test-fixture tables like `_rls_probe` intentionally aren't reflected there.
