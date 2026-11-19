import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@shared/errors/domain.error.js';

// Error keys and statuses of SPEC-0004 section 6. Every message is fixed and
// code-only: @nestjs/observe copies the stack, message included, of an error
// thrown through an instrumented provider, and R13 keeps client data out of it.
// None of these errors has a `cause`.

export class ClientNotFoundError extends DomainError {
  readonly code = 'client.not-found';
  readonly status = HttpStatus.NOT_FOUND;

  constructor() {
    super('client error: client.not-found');
  }
}

export class ClientEmailTakenError extends DomainError {
  readonly code = 'clientEmail.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'email';

  constructor() {
    super('client error: clientEmail.taken');
  }
}

export class ConsentTextOutdatedError extends DomainError {
  readonly code = 'consentText.outdated';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'consentTextVersion';

  constructor() {
    super('client error: consentText.outdated');
  }
}

export class ClientPhoneRequiredError extends DomainError {
  readonly code = 'phone.required';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field = 'phone';

  constructor() {
    super('client error: phone.required');
  }
}

export class ClientHasHistoryError extends DomainError {
  readonly code = 'client.has-history';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('client error: client.has-history');
  }
}

export class ClientStatusUnchangedError extends DomainError {
  readonly code = 'client.status-unchanged';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('client error: client.status-unchanged');
  }
}

export class ClientDeleteConfirmationRequiredError extends DomainError {
  readonly code = 'deleteConfirmation.required';
  readonly status = HttpStatus.BAD_REQUEST;
  readonly field = 'confirmName';

  constructor() {
    super('client error: deleteConfirmation.required');
  }
}

export class ClientCursorInvalidError extends DomainError {
  readonly code = 'cursor.invalid';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field = 'after';

  constructor() {
    super('client error: cursor.invalid');
  }
}

/**
 * Any failure of a clients query other than the ones mapped above. Drizzle's
 * own error message holds the query parameters (the client's name and e-mail),
 * so the repository replaces it with this one: a fixed message, the Postgres
 * error code and the constraint name, no `cause` (SPEC-0004 plan, Risks 1).
 */
export class ClientPersistenceError extends Error {
  constructor(
    readonly pgCode: string,
    readonly constraint: string,
  ) {
    super(`client persistence error (pg ${pgCode})`);
    this.name = 'ClientPersistenceError';
  }
}
