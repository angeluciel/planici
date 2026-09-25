import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantIsolationPolicy } from './rls.js';
import { tenants } from './tenants.js';

/**
 * TEST-FIXTURE TABLE — NOT part of the product schema.
 *
 * Exists only to prove the tenant-isolation RLS pattern (JOA-19, AC7)
 * without touching a domain table. Application code must never read or
 * write `_rls_probe`; it is exercised exclusively by the e2e
 * "zero cross-tenant leakage" test (Testcontainers Postgres) and, if
 * useful, a smoke check against real environments that the pattern still
 * holds after a deploy. It ships as a real migration (see db.md #3 for the
 * rationale) so `apps/api/test/setup/database.global-setup.ts`, which runs
 * `migrate()` against the real `drizzle/` folder, picks it up for free.
 */
export const rlsProbe = pgTable(
  '_rls_probe',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rls_probe_tenant_id').on(table.tenantId),
    tenantIsolationPolicy('_rls_probe'),
  ],
).enableRLS();

export type RlsProbeRow = typeof rlsProbe.$inferSelect;
