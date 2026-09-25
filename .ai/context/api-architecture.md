---
owner: api-engineer
sources:
  - apps/api/src/**
  - apps/api/test/**
  - packages/transactional/**
verified_at: 28e5aec
---
# API architecture — context card

NestJS 12 + @nestjs/cqrs, hexagonal. See apps/api/AGENTS.md for the folder layout.

## Endpoints (v1, root `auth`)
login · logout · register · refresh-session · request-email-code · verify-email-code ·
request-password-reset · reset-password · GET check-availability · GET me (JWT guard)

## Request pipeline
Controller (`@Body({ schema, pipes: [new ZodBody(S)] })`, `@Throttle`) → `CommandBus.execute(new XCommand(body, contextOf(req)))`
→ handler (uses ports) -> domain errors -> `DomainExceptionFilter` -> `ApiErrorBody`. Trace interceptor on all requests.

## Events
Domain events (`domain/events/auth.events.ts`) -> `event-handlers/*` -> MailService (console | SES) with templates from packages/transactional.

## Env schema (`src/config/env.schema.ts`, the one place `process.env` is read)
- `NODE_ENV` has no default — missing value fails boot. `prod` is normalized to `production`; any other value is rejected.
- `DATABASE_URL` (owner/migration role, always required) vs `DATABASE_URL_APP` (runtime app role, non-owner/non-superuser/non-BYPASSRLS — JOA-19 AC6). `DATABASE_URL_APP` optional in dev/test (falls back to `DATABASE_URL`), **required** in production via `superRefine` (fail closed).
- `superRefine` also rejects `AWS_LAMBDA_FUNCTION_NAME` set with `NODE_ENV !== 'production'` (deployed-runtime guard).
- `database.config.ts` (`registerAs('database', ...)`) picks `DATABASE_URL_APP || DATABASE_URL`; drizzle-kit/migrations keep using `DATABASE_URL` directly, untouched.

## Env files
`config.module.ts:14` `envFilePath: ['.env.local', '.env']` resolves relative to `process.cwd()`; `pnpm --filter api`/turbo always run with cwd `apps/api`, so only `apps/api/.env(.local)` loads. The root `/.env` does exist (gitignored) but is never read by the api or by drizzle-kit — it's only interpolated by `compose.sonar.yml` (`SONAR_DB_PASSWORD`); `compose.yaml` uses `$$` (container-side) so it never reads it either. `ignoreEnvFile: NODE_ENV === 'test'` (line 17) skips files entirely in tests; e2e env comes from `test/setup/env.ts` instead. `drizzle.config.ts:8` reads `process.env.DATABASE_URL`; drizzle-kit's CLI bundles `dotenv` and auto-loads `.env` from cwd, so `pnpm --filter api exec drizzle-kit migrate` also only picks up `apps/api/.env`.

## Tenant-scoped RLS pattern (JOA-19)
- `src/database/schema/rls.ts`: `TENANT_SESSION_VAR = 'app.current_tenant'`; `tenantIsolationPolicy(tableName)` — reusable `pgPolicy` (FOR ALL, USING = WITH CHECK = `tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid`). Apply to every tenant-scoped table (see doc comment for the full `pgTable(...).enableRLS()` recipe) — the table needs a NOT NULL `tenant_id uuid` column, an index on it, and the migration must hand-append `ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;` (drizzle-kit doesn't emit FORCE).
- `src/database/schema/rls-probe.ts`: `_rls_probe` — test-fixture-only table proving the pattern; never read/write it from product code.
- `src/shared/database/tenant-unit-of-work.{port,service,module,errors}.ts`: `TENANT_UNIT_OF_WORK` port (`run<T>(tenantId, work: (tx: TenantTx) => Promise<T>): Promise<T>`), implemented by `DrizzleTenantUnitOfWork` — opens a `db.transaction`, binds `app.current_tenant` via bound-param `select set_config($1, $2, true)` (never string-interpolated) before running `work`, `is_local = true` so Postgres auto-discards it on commit/rollback. Validates `tenantId` is a UUID first, else throws `InvalidTenantIdError` (`DomainError`, code `tenant.invalid-id`). `TenantUnitOfWorkModule` exports the port (import via `TENANT_UNIT_OF_WORK`); registered globally in `app.module.ts`. Tenant *resolution* (JWT/membership → tenantId) is out of scope here (JOA-23).
- Repositories/handlers needing tenant isolation: inject `TENANT_UNIT_OF_WORK`, call `.run(tenantId, async (tx) => ...)` and run all queries on the given `tx`, not the raw `DRIZZLE` db.

## Tests
Unit: handler specs with fake ports. E2E: test/e2e against a Testcontainers Postgres 17; `test/setup/database.global-setup.ts` runs drizzle migrations with the owner role then provisions a second non-superuser `planici_test_app` role (DML-only grants) exposed as `testDatabaseUrlApp`; `test/setup/env.ts` wires `DATABASE_URL` (owner, used for fixture seeding that must bypass RLS) and `DATABASE_URL_APP` (app runtime) separately. `test/e2e/tenant-rls.e2e-spec.ts` is the cross-tenant-leakage proof (AC2/AC7).
