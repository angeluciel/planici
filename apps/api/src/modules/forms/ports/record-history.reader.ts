import type { TransactionHandle } from './form-repository.js';

export const RECORD_HISTORY_READER = Symbol('RECORD_HISTORY_READER');

/**
 * Records with linked history (appointments, payments; SPEC-0001 R8). Scheduling
 * and payments do not exist yet, so the default adapter reports none.
 */
export interface RecordHistoryReader {
  /** How many of the template's records have linked history. */
  countRecordsWithHistory(
    tenantId: string,
    formId: string,
    tx?: TransactionHandle,
  ): Promise<number>;
}
