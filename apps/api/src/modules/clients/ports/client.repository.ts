import type { ClientStatus, ClientStatusFilter } from '@planici/schemas';
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
};

export type NewClient = Omit<StoredClient, 'id' | 'status'> & {
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
};

export type ClientListFilter = {
  status: ClientStatusFilter;
  search: ClientSearch | null;
  after: { nameKey: string; id: string } | null;
  /** Rows to fetch: the page size plus one. */
  take: number;
};

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

  setStatus(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
    status: ClientStatus,
  ): Promise<void>;

  list(tenantId: string, filter: ClientListFilter): Promise<ClientListRow[]>;

  /** Deletes the `form_records` row; the cascade removes the client and its values. */
  deleteRecord(
    tx: TenantTransaction,
    tenantId: string,
    formRecordId: string,
  ): Promise<void>;
}
