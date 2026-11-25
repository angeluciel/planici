import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';

export const SERVICE_HISTORY_READER = Symbol('SERVICE_HISTORY_READER');

/**
 * Whether a service has linked history (appointments, plans, financial
 * records; SPEC-0005 R7). Scheduling does not exist yet, so the default adapter
 * reports none.
 */
export interface ServiceHistoryReader {
  hasHistory(
    tenantId: string,
    serviceId: string,
    tx?: TransactionHandle,
  ): Promise<boolean>;

  /** The ids among `serviceIds` that have history; one call per list page (G-9). */
  withHistory(
    tenantId: string,
    serviceIds: readonly string[],
  ): Promise<Set<string>>;
}
