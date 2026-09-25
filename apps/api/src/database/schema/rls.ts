import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

/**
 * Session variable the API sets (via `SET LOCAL` / `set_config`, scoped to the
 * current transaction) before running any query for a tenant-resolved
 * request. See JOA-19 / RFC §5.3.2.
 *
 * IMPORTANT: `current_setting(..., true)` (the `true` = "missing_ok") makes
 * the policy fail CLOSED — if the variable was never set (pooled connection
 * reused, code path forgot the interceptor, direct psql access, …),
 * `current_setting` returns NULL, `tenant_id = NULL` is never true, and the
 * policy returns zero rows instead of erroring or leaking other tenants'
 * rows (AC2).
 *
 * IMPORTANT (2): `nullif(..., '')` wraps that call because Postgres's
 * reset-on-commit/rollback value for a *previously-set* custom GUC is `''`
 * (empty string), not NULL — only a GUC that was NEVER set on the
 * connection reads back as NULL. On a reused pooled connection, once
 * `set_config('app.current_tenant', ..., true)` has run at least once,
 * every later transaction that "forgot" to call the tenant interceptor
 * would otherwise see `''::uuid`, which raises `invalid input syntax for
 * type uuid` instead of returning zero rows. `nullif('', '')` normalizes
 * that empty string back to NULL first, so the cast is only ever applied
 * to a real UUID string or NULL, and AC2 ("zero rows, not an error") holds
 * for both the fresh-connection and reused-connection cases.
 */
export const TENANT_SESSION_VAR = 'app.current_tenant';

/**
 * Reusable RLS predicate: true only when the row's `tenant_id` column
 * matches the tenant bound to the current transaction.
 */
const tenantMatchesSession = sql`tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid`;

/**
 * Tenant-isolation RLS policy template (AC4). Apply to every tenant-scoped
 * table:
 *
 *   export const clients = pgTable(
 *     'clients',
 *     { id: uuid('id').primaryKey()..., tenantId: uuid('tenant_id').notNull()... , ... },
 *     (table) => [
 *       index('idx_clients_tenant_id').on(table.tenantId),
 *       tenantIsolationPolicy('clients'),
 *     ],
 *   ).enableRLS();
 *
 * `.enableRLS()` emits `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
 * `FORCE ROW LEVEL SECURITY` is NOT emitted by drizzle-kit (no schema-level
 * API for it as of drizzle-kit 0.31) — every migration that adds a
 * tenant-scoped table must hand-append
 * `ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;` to the generated SQL
 * file (see drizzle/0001_rls_probe.sql for the pattern). This is required
 * so the policy also applies to the table owner (AC6) — without FORCE, an
 * app connection using the owner/migration role bypasses RLS entirely.
 *
 * The table MUST have a NOT NULL `tenant_id uuid` column referencing
 * `tenants.id`. This policy is `FOR ALL` (SELECT/INSERT/UPDATE/DELETE) with
 * the same expression in USING and WITH CHECK, so a session can't read
 * tenant A's rows nor write a row tagged with a foreign tenant_id.
 */
export function tenantIsolationPolicy(tableName: string) {
  return pgPolicy(`${tableName}_tenant_isolation`, {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: tenantMatchesSession,
    withCheck: tenantMatchesSession,
  });
}
