import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';

export const CLIENT_HISTORY_READER = Symbol('CLIENT_HISTORY_READER');

/**
 * Whether a client has linked history (appointments, payments; SPEC-0004 R7).
 * Scheduling and payments do not exist yet, so the default adapter reports none.
 */
export interface ClientHistoryReader {
  hasHistory(
    tenantId: string,
    clientId: string,
    tx?: TransactionHandle,
  ): Promise<boolean>;
}
