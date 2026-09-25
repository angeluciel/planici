---
owner: data-steward
sources:
  - apps/api/src/database/**
  - apps/api/drizzle/**
  - docs/schema.dbml
verified_at: 9fc266b
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
**Known gap (unresolved as of JOA-19):** app runtime role == migration/owner role today (single `DATABASE_URL`); in Testcontainers e2e that role is a real Postgres superuser, which bypasses RLS regardless of FORCE. Needs a platform-engineer-provisioned non-superuser app role before RLS is actually enforced end-to-end — see `.ai/work/JOA-19/answers.md` #2.

## Gotchas
- No `db:generate` / `db:migrate` scripts in apps/api/package.json yet (use `pnpm --filter api exec drizzle-kit …`).
- `docs/schema.dbml` targets the *product* domain model only — test-fixture tables like `_rls_probe` intentionally aren't reflected there.
