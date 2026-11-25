import type {
  ServiceSort,
  ServiceStatus,
  ServiceStatusFilter,
  ServiceTemplateSummary,
} from '@planici/schemas';
import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { ServiceSearch } from '../domain/service-search.js';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

/** The caller's transaction, or the pool for a read on its own. */
export type ServiceExecutor = TenantTransaction | Database;

export type StoredService = {
  id: string;
  tenantId: string;
  formRecordId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency: 'BRL';
  status: ServiceStatus;
  createdAt: Date;
  /** The service's last update time (SPEC-0006 R9). */
  updatedAt: Date;
};

export type ServiceAttributes = {
  name: string;
  nameKey: string;
  durationMinutes: number;
  priceCents: number;
};

export type NewService = ServiceAttributes & {
  tenantId: string;
  formRecordId: string;
};

export type ServiceListRow = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency: 'BRL';
  formId: string;
  formName: string;
  status: ServiceStatus;
  updatedAt: Date;
  /** What the next cursor carries for this row under the requested sort. */
  sortKey: string;
};

export type ServiceListFilter = {
  status: ServiceStatusFilter;
  search: ServiceSearch | null;
  /** The template filter (SPEC-0006 R1), or null for every template. */
  formId: string | null;
  sort: ServiceSort;
  after: { key: string; id: string } | null;
  /** Rows to fetch: the page size plus one. */
  take: number;
};

export type ServiceCountFilter = Omit<ServiceListFilter, 'after' | 'take'>;

/**
 * Reads and writes `services`. Every query filters by `tenant_id`. A failure
 * other than the unique name violation is rethrown as `ServicePersistenceError`.
 */
export interface ServiceRepository {
  /** Runs `work` in one tenant-scoped transaction. */
  transaction<T>(
    tenantId: string,
    work: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T>;

  /** Throws `ServiceNameTakenError` on an `idx_services_tenant_name_key` violation. */
  insert(tx: TenantTransaction, service: NewService): Promise<{ id: string }>;

  /** Locks the service row `for update`, then reads it. */
  lockById(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
  ): Promise<StoredService | null>;

  /** On the caller's transaction, or on the pool when `executor` is omitted. */
  find(
    tenantId: string,
    serviceId: string,
    executor?: ServiceExecutor,
  ): Promise<StoredService | null>;

  /** Throws `ServiceNameTakenError` on an `idx_services_tenant_name_key` violation. */
  updateAttributes(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
    attributes: ServiceAttributes,
  ): Promise<void>;

  /** Returns the stored last update time (SPEC-0006 R9). */
  setStatus(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
    status: ServiceStatus,
  ): Promise<Date>;

  list(tenantId: string, filter: ServiceListFilter): Promise<ServiceListRow[]>;

  /** The number of services `list` would return without the cursor and the limit. */
  count(tenantId: string, filter: ServiceCountFilter): Promise<number>;

  /** The narrow chips (R14). */
  templateSummary(tenantId: string): Promise<ServiceTemplateSummary>;

  /** Deletes the `form_records` row; the cascade removes the service and its values. */
  deleteRecord(
    tx: TenantTransaction,
    tenantId: string,
    formRecordId: string,
  ): Promise<void>;
}
