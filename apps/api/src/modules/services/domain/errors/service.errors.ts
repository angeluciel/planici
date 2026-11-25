import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@shared/errors/domain.error.js';

// Error keys and statuses of SPEC-0005 section 6. Every message is fixed and
// code-only: @nestjs/observe copies the stack, message included, of an error
// thrown through an instrumented provider. None of these errors has a `cause`.

export class ServiceNotFoundError extends DomainError {
  readonly code = 'service.not-found';
  readonly status = HttpStatus.NOT_FOUND;

  constructor() {
    super('service error: service.not-found');
  }
}

export class ServiceNameTakenError extends DomainError {
  readonly code = 'serviceName.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'name';

  constructor() {
    super('service error: serviceName.taken');
  }
}

export class ServiceHasHistoryError extends DomainError {
  readonly code = 'service.has-history';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('service error: service.has-history');
  }
}

export class ServiceStatusUnchangedError extends DomainError {
  readonly code = 'service.status-unchanged';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('service error: service.status-unchanged');
  }
}

export class ServiceDeleteConfirmationRequiredError extends DomainError {
  readonly code = 'deleteConfirmation.required';
  readonly status = HttpStatus.BAD_REQUEST;
  readonly field = 'confirmName';

  constructor() {
    super('service error: deleteConfirmation.required');
  }
}

export class ServiceCursorInvalidError extends DomainError {
  readonly code = 'cursor.invalid';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field = 'after';

  constructor() {
    super('service error: cursor.invalid');
  }
}

/**
 * Any failure of a services query other than the ones mapped above. Drizzle's
 * own error message holds the query parameters, so the repository replaces it
 * with this one: a fixed message, the Postgres code and the constraint name,
 * no `cause`.
 */
export class ServicePersistenceError extends Error {
  constructor(
    readonly pgCode: string,
    readonly constraint: string,
  ) {
    super(`service persistence error (pg ${pgCode})`);
    this.name = 'ServicePersistenceError';
  }
}
