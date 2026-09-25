import { StringChunk, type SQL } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@src/database/database.module.js';
import { TENANT_SESSION_VAR } from '@src/database/schema/index.js';
import { InvalidTenantIdError } from './tenant-unit-of-work.errors.js';
import { DrizzleTenantUnitOfWork } from './tenant-unit-of-work.service.js';

const TENANT_A = '11111111-1111-1111-1111-111111111111';

/** Fake query runner: records call order so AC1 (set_config before `work`'s
 * own queries) and AC3 (transaction always runs, on both paths) can be
 * asserted without a real Postgres connection. */
interface FakeTx {
  execute: (query: SQL) => Promise<void>;
}

function fakeDatabase() {
  const calls: string[] = [];
  const execute = vi.fn(async (_query: SQL) => {
    calls.push('execute');
  });
  const tx: FakeTx = { execute };

  const transaction = vi.fn(async (work: (tx: FakeTx) => Promise<unknown>) => {
    calls.push('transaction:start');
    try {
      return await work(tx);
    } finally {
      calls.push('transaction:end');
    }
  });

  return {
    db: { transaction } as unknown as Database,
    transaction,
    execute,
    calls,
  };
}

/**
 * `sql\`...\`` keeps the *literal* SQL text as `StringChunk`s and every
 * interpolated `${value}` as a separate, un-inlined chunk (bound as a
 * parameter when the query is compiled) — this is what makes AC5 hold by
 * construction. So: literal SQL text = the `StringChunk`s; bound
 * parameters = everything else, in order.
 */
function queryTextOf(query: SQL): string {
  return query.queryChunks
    .filter((chunk): chunk is StringChunk => chunk instanceof StringChunk)
    .map((chunk) => chunk.value.join(''))
    .join('');
}

function paramsOf(query: SQL): unknown[] {
  return query.queryChunks.filter((chunk) => !(chunk instanceof StringChunk));
}

describe('DrizzleTenantUnitOfWork', () => {
  it('opens a transaction and binds app.current_tenant via set_config before running work (AC1)', async () => {
    const { db, execute, calls } = fakeDatabase();
    const uow = new DrizzleTenantUnitOfWork(db);

    const work = vi.fn(async () => {
      calls.push('work');
      return 'result';
    });

    const result = await uow.run(TENANT_A, work);

    expect(result).toBe('result');
    expect(calls).toEqual([
      'transaction:start',
      'execute',
      'work',
      'transaction:end',
    ]);

    const query = execute.mock.calls[0]?.[0] as SQL;
    expect(queryTextOf(query)).toContain('set_config');
  });

  it('binds the session var name and tenantId as parameters, never string-interpolated (AC5)', async () => {
    const { db, execute } = fakeDatabase();
    const uow = new DrizzleTenantUnitOfWork(db);

    await uow.run(TENANT_A, async () => undefined);

    const query = execute.mock.calls[0]?.[0] as SQL;
    expect(paramsOf(query)).toEqual([TENANT_SESSION_VAR, TENANT_A]);
    expect(queryTextOf(query)).not.toContain(TENANT_A);
    expect(queryTextOf(query)).not.toContain(TENANT_SESSION_VAR);
  });

  it('rejects a non-UUID tenantId before ever opening a transaction (AC5 defense in depth)', async () => {
    const { db, transaction } = fakeDatabase();
    const uow = new DrizzleTenantUnitOfWork(db);

    await expect(
      uow.run('not-a-uuid', async () => undefined),
    ).rejects.toBeInstanceOf(InvalidTenantIdError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing tenantId before ever opening a transaction (AC5 defense in depth)', async () => {
    const { db, transaction } = fakeDatabase();
    const uow = new DrizzleTenantUnitOfWork(db);

    await expect(
      uow.run(undefined as unknown as string, async () => undefined),
    ).rejects.toBeInstanceOf(InvalidTenantIdError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('always runs inside a transaction, on both the commit and rollback paths (AC3)', async () => {
    const { db, calls } = fakeDatabase();
    const uow = new DrizzleTenantUnitOfWork(db);

    await uow.run(TENANT_A, async () => 'ok');
    expect(calls).toEqual(['transaction:start', 'execute', 'transaction:end']);

    calls.length = 0;
    const failure = new Error('work blew up');
    await expect(
      uow.run(TENANT_A, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    // the transaction wrapper still ran end-to-end — commit/rollback (and
    // therefore discarding `app.current_tenant`) is delegated to Drizzle's
    // own `db.transaction`, which always settles the promise either way.
    expect(calls).toEqual(['transaction:start', 'execute', 'transaction:end']);
  });
});
