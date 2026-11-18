import type { FormStatus, FormType } from '@planici/schemas';
import type { Database } from '@src/database/database.module.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { RecordVersionField } from '../domain/record-version.js';

export const RECORD_FORM_READER = Symbol('RECORD_FORM_READER');

/** The caller's transaction, or the pool for a read on its own. */
export type RecordExecutor = TenantTransaction | Database;

export type RecordTemplateHead = {
  id: string;
  type: FormType;
  name: string;
  status: FormStatus;
  latestVersion: number;
};

export type StoredRecordVersion = {
  id: string;
  number: number;
  fields: RecordVersionField[];
};

/** Reads the template tables for records. It never imports forms code. */
export interface RecordFormReader {
  /**
   * Reads the template row `for share`, so a create waits for a template
   * update, archive or delete in progress and then sees its result (R7).
   */
  lockTemplateForShare(
    tx: TenantTransaction,
    tenantId: string,
    formId: string,
  ): Promise<RecordTemplateHead | null>;

  /** One version with its fields in display order and current metadata. */
  findVersion(
    executor: RecordExecutor,
    tenantId: string,
    formId: string,
    version: number,
  ): Promise<StoredRecordVersion | null>;
}
