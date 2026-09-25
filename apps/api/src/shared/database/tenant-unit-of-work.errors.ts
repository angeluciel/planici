import { DomainError } from '@shared/errors/domain.error.js';

/**
 * Guards AC5 (defense in depth): `set_config` already binds `tenantId` as a
 * parameter, so this isn't required to prevent SQL injection, but it stops a
 * malformed/missing tenant id from ever reaching the DB and silently
 * matching (or failing to match) rows in a confusing way.
 */
export class InvalidTenantIdError extends DomainError {
  readonly code = 'tenant.invalid-id';

  constructor(tenantId: unknown) {
    super(`Expected tenantId to be a UUID, got: ${String(tenantId)}`);
  }
}
