import type { Database } from '@src/database/database.module.js';

export const TENANT_UNIT_OF_WORK = Symbol('TENANT_UNIT_OF_WORK');

/**
 * The Drizzle transaction handle handed to a tenant-scoped unit of work
 * callback — same shape `db.transaction(async (tx) => ...)` gives you, so
 * repositories can run their normal query-builder calls against it.
 */
type ExtractTransaction<T> = T extends (tx: infer Tx) => unknown ? Tx : never;
export type TenantTx = ExtractTransaction<
  Parameters<Database['transaction']>[0]
>;

/**
 * Tenant-scoped unit of work (JOA-19 AC1/AC3/AC5).
 *
 * Given an already-resolved `tenantId` (tenant resolution itself — from a
 * JWT/membership — is JOA-23, out of scope here), opens a DB transaction,
 * binds `app.current_tenant` to it via `select set_config(...)` (a bound
 * parameter, never string-interpolated SQL — AC5) *before* any other query
 * runs, then runs `work` on that transaction.
 *
 * Because the session variable is set with `set_config(..., true)` (the
 * `is_local = true` third argument, equivalent to `SET LOCAL`), Postgres
 * discards it automatically on commit or rollback (AC3) — the pooled
 * connection carries no residual tenant context into the next request.
 */
export interface TenantUnitOfWork {
  run<T>(tenantId: string, work: (tx: TenantTx) => Promise<T>): Promise<T>;
}
