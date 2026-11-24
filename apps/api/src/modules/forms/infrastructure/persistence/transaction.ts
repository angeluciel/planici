import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { TransactionHandle } from '../../ports/form-repository.js';

/** The handle is opaque outside persistence; inside it is the Drizzle transaction. */
export const toHandle = (tx: TenantTransaction): TransactionHandle =>
  tx as unknown as TransactionHandle;

export const fromHandle = (handle: TransactionHandle): TenantTransaction =>
  handle as unknown as TenantTransaction;

/** A pooled connection or an open transaction: both run the same queries. */
export type Executor = Database | TenantTransaction;

export const UNIQUE_VIOLATION = '23505';

/** The constraint a Postgres unique violation names, or null for any other error. */
export function uniqueViolationOf(error: unknown): string | null {
  const candidate = error instanceof Error && error.cause ? error.cause : error;
  if (typeof candidate !== 'object' || candidate === null) return null;
  if ((candidate as { code?: string }).code !== UNIQUE_VIOLATION) return null;

  return (candidate as { constraint?: string }).constraint ?? '';
}
