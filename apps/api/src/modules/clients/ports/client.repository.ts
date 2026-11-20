import type {
  ClientSort,
  ClientStatus,
  ClientStatusFilter,
} from '@planici/schemas';
import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { ClientSearch } from '../domain/client-search.js';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

/** The caller's transaction, or the pool for a read on its own. */
export type ClientExecutor = TenantTransaction | Database;

export type StoredClient = {
  id: string;
  tenantId: string;
  formRecordId: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  consentAttestedBy: string;
  consentAttestedAt: Date;
  consentTextVersion: string;
  /** The client's last update time (SPEC-0006 R9). */
  updatedAt: Date;
};

/** `updatedAt` is the database's `now()` on insert. */
export type NewClient = Omit<StoredClient, 'id' | 'status' | 'updatedAt'> & {
  nameKey: string;
};

export type ClientListRow = {
  id: string;
  name: string;
  nameKey: string;
  email: string;
  phone: string | null;
  formId: string;
  formName: string;
  status: ClientStatus;
  updatedAt: Date;
  /**
   * What the next cursor carries for this row under the requested sort:
   * `name_key`, or the exact `updated_at` text (SPEC-0006 plan, G-6).
   */
  sortKey: string;
};

export type ClientListFilter = {
  status: ClientStatusFilter;
  search: ClientSearch | null;
  /** The template filter (SPEC-0006 R1), or null for every template. */
  formId: string | null;
  sort: ClientSort;
  after: { key: string; id: string } | null;
  /** Rows to fetch: the page size plus one. */
  take: number;
};

export type ClientCountFilter = Omit<ClientListFilter, 'after' | 'take'>;

/**
 * Reads and writes `clients`. Every query filters by `tenant_id`. A failure
 * other than the unique e-mail violation is rethrown as `ClientPersistenceError`
 * (no client data in it).
 */
export interface ClientRepository {
  /** Runs `work` in one tenant-scoped transaction. */
  transaction<T>(
    tenantId: string,
    work: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T>;

  /** Throws `ClientEmailTakenError` on an `idx_clients_tenant_email` violation. */
  insert(tx: TenantTransaction, client: NewClient): Promise<{ id: string }>;

  /** Locks the client row `for update`, then reads it. */
  lockById(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
  ): Promise<StoredClient | null>;

  /** On the caller's transaction, or on the pool when `executor` is omitted. */
  find(
    tenantId: string,
    clientId: string,
    executor?: ClientExecutor,
  ): Promise<StoredClient | null>;

  /** Throws `ClientEmailTakenError` on an `idx_clients_tenant_email` violation. */
  updateAttributes(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
    attributes: {
      name: string;
      nameKey: string;
      email: string;
      phone: string | null;
    },
  ): Promise<void>;

  /** Returns the stored last update time (SPEC-0006 R9). */
  setStatus(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
    status: ClientStatus,
  ): Promise<Date>;

  list(tenantId: string, filter: ClientListFilter): Promise<ClientListRow[]>;

  /** The number of clients `list` would return without the cursor and the limit (SPEC-0006 R3). */
  count(tenantId: string, filter: ClientCountFilter): Promise<number>;

  /** Deletes the `form_records` row; the cascade removes the client and its values. */
  deleteRecord(
    tx: TenantTransaction,
    tenantId: string,
    formRecordId: string,
  ): Promise<void>;
}
