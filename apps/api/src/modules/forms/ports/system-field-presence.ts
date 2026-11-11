export const SYSTEM_FIELD_PRESENCE = Symbol('SYSTEM_FIELD_PRESENCE');

/**
 * Presence of `client.phone`, the only system field that can gain "required"
 * (SPEC-0002 R3). Its values live on the client rows (SPEC-0004), so the
 * clients module provides the real adapter; the default one returns no ids.
 */
export interface SystemFieldPresence {
  /** Ids of the template's records that have no `client.phone`. */
  findRecordIdsWithoutClientPhone(
    tenantId: string,
    formId: string,
  ): Promise<string[]>;
}
