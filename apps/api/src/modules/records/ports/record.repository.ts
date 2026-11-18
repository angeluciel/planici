import type { FormStatus, FormType } from '@planici/schemas';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { RecordExecutor } from './record-form.reader.js';

export const RECORD_REPOSITORY = Symbol('RECORD_REPOSITORY');

export type StoredRecord = {
  id: string;
  formId: string;
  formVersionId: string;
  versionNumber: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  formType: FormType;
  formName: string;
  formStatus: FormStatus;
  formLatestVersion: number;
};

export type StoredValue = {
  fieldId: string;
  keyVersion: number;
  ciphertext: Buffer;
};

export type NewStoredValue = StoredValue;

/** Reads and writes `form_records` and `form_record_values`. Every query filters by tenant. */
export interface RecordRepository {
  /** Locks the record row `for update`, then reads it. */
  lockForUpdate(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<StoredRecord | null>;

  find(
    executor: RecordExecutor,
    tenantId: string,
    recordId: string,
  ): Promise<StoredRecord | null>;

  insert(
    tx: TenantTransaction,
    record: {
      id: string;
      tenantId: string;
      formId: string;
      formVersionId: string;
    },
  ): Promise<void>;

  listValues(
    executor: RecordExecutor,
    tenantId: string,
    recordId: string,
  ): Promise<StoredValue[]>;

  insertValues(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
    values: NewStoredValue[],
  ): Promise<void>;

  deleteValues(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<void>;

  /** Raises `revision` by 1 and sets `updated_at`. */
  touch(
    tx: TenantTransaction,
    tenantId: string,
    recordId: string,
  ): Promise<void>;
}
