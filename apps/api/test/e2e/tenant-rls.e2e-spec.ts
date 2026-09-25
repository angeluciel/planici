import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PG_POOL } from '@src/database/database.constants.js';
import * as schema from '@src/database/schema/index.js';
import { rlsProbe, tenants } from '@src/database/schema/index.js';
import {
  TENANT_UNIT_OF_WORK,
  type TenantUnitOfWork,
} from '@shared/database/tenant-unit-of-work.port.js';
import { createTestApp, type TestContext } from '../setup/test-app.js';

/**
 * JOA-19 — proves the tenant-isolation RLS pattern end to end against the
 * `_rls_probe` fixture table (no domain table gets RLS in this ticket).
 *
 * The app under test (`ctx`) connects with `DATABASE_URL_APP` — the
 * non-superuser, non-owner, non-BYPASSRLS role provisioned in
 * `test/setup/database.global-setup.ts` — so this is a real proof, not a
 * false positive against a role that bypasses RLS (AC6).
 *
 * Fixture rows are seeded through a *separate* connection using the
 * owner/migration role (`DATABASE_URL`), which is a Postgres superuser in
 * this Testcontainers bootstrap and therefore bypasses RLS by design —
 * exactly the setup `.ai/work/JOA-19/db.md` describes.
 */

let ctx: TestContext;
let uow: TenantUnitOfWork;
let ownerPool: Pool;
let ownerDb: ReturnType<typeof drizzle<typeof schema>>;

let tenantAId: string;
let tenantBId: string;

async function seedTenant(name: string): Promise<string> {
  const [row] = await ownerDb
    .insert(tenants)
    .values({ name, slug: `${name}-${randomUUID()}` })
    .returning({ id: tenants.id });

  if (!row) throw new Error('seed tenant insert returned no row');
  return row.id;
}

async function seedProbeRow(tenantId: string, label: string): Promise<void> {
  await ownerDb.insert(rlsProbe).values({ tenantId, label });
}

describe('Tenant RLS isolation (_rls_probe, JOA-19)', () => {
  beforeAll(async () => {
    ctx = await createTestApp();
    uow = ctx.app.get<TenantUnitOfWork>(TENANT_UNIT_OF_WORK);

    ownerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    ownerDb = drizzle(ownerPool, { schema });

    // sanity check this really is a different role than the app's PG_POOL
    // (AC6) — not required by any AC on its own, but a cheap early failure
    // if the two env vars ever end up pointing at the same connection.
    const [appUser] = (
      await ctx.app.get<Pool>(PG_POOL).query('select current_user')
    ).rows as { current_user: string }[];
    const [ownerUser] = (await ownerPool.query('select current_user')).rows as {
      current_user: string;
    }[];
    if (appUser?.current_user === ownerUser?.current_user) {
      throw new Error(
        'DATABASE_URL_APP resolved to the same role as DATABASE_URL — RLS proof would be a false positive',
      );
    }
  });

  afterAll(async () => {
    await ownerPool.end();
    await ctx.close();
  });

  beforeEach(async () => {
    // Truncating `tenants` CASCADEs into `_rls_probe` (FK onDelete: cascade)
    // — TRUNCATE isn't subject to RLS, so this works via either role.
    await ctx.truncate();

    tenantAId = await seedTenant('tenant-a');
    tenantBId = await seedTenant('tenant-b');
    await seedProbeRow(tenantAId, 'a-1');
    await seedProbeRow(tenantAId, 'a-2');
    await seedProbeRow(tenantBId, 'b-1');
  });

  it('returns zero rows on the app role when app.current_tenant was never set (AC2)', async () => {
    const result = await ctx.pool.query('select * from _rls_probe');
    expect(result.rows).toHaveLength(0);
  });

  it('returns only the tenant bound to the transaction, never another tenant’s rows (AC1, AC2)', async () => {
    const rowsA = await uow.run(tenantAId, (tx) => tx.select().from(rlsProbe));
    expect(rowsA).toHaveLength(2);
    expect(rowsA.every((row) => row.tenantId === tenantAId)).toBe(true);

    const rowsB = await uow.run(tenantBId, (tx) => tx.select().from(rlsProbe));
    expect(rowsB).toHaveLength(1);
    expect(rowsB.every((row) => row.tenantId === tenantBId)).toBe(true);
  });

  // AC2/AC3 — the pooled-connection-reused case: `rls.ts`'s
  // `tenantMatchesSession` now does `nullif(current_setting(...), '')::uuid`,
  // so a custom GUC reset to `''` on commit/rollback yields 0 rows instead of
  // a cast error. See `.ai/work/JOA-19/db.md` "Follow-up fix".
  it('discards app.current_tenant on commit — no leak into the next request on the pooled connection (AC3)', async () => {
    const rowsA = await uow.run(tenantAId, (tx) => tx.select().from(rlsProbe));
    expect(rowsA.length).toBeGreaterThan(0);

    // Un-scoped query right after tenant A's transaction committed — if
    // `app.current_tenant` had leaked past the commit, this would still
    // see tenant A's rows instead of zero.
    const unscoped = await ctx.pool.query('select * from _rls_probe');
    expect(unscoped.rows).toHaveLength(0);

    // ... and the *next* tenant-scoped transaction on the same pooled
    // connection never sees tenant A's rows either.
    const rowsB = await uow.run(tenantBId, (tx) => tx.select().from(rlsProbe));
    expect(rowsB.every((row) => row.tenantId === tenantBId)).toBe(true);
  });

  it('discards app.current_tenant on rollback too (AC3)', async () => {
    await expect(
      uow.run(tenantAId, async (tx) => {
        const rows = await tx.select().from(rlsProbe);
        expect(rows.length).toBeGreaterThan(0);
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const unscoped = await ctx.pool.query('select * from _rls_probe');
    expect(unscoped.rows).toHaveLength(0);
  });

  it('documents why AC6 matters: the owner/migration role bypasses RLS entirely', async () => {
    // No app.current_tenant is set on this connection either — yet the
    // owner/bootstrap role (a real Postgres superuser in this
    // Testcontainers setup) sees every tenant's rows regardless, because
    // superusers bypass RLS unconditionally, even with FORCE ROW LEVEL
    // SECURITY. This is exactly why the app's runtime pool must use the
    // separate DATABASE_URL_APP role instead.
    const result = await ownerPool.query('select * from _rls_probe');
    expect(result.rows.length).toBe(3);
  });
});
