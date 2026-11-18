import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@shared/errors/domain.error.js';

// Error keys and statuses of SPEC-0003 section 6. Every message is fixed and
// code-only: @nestjs/observe copies the stack, message included, of an error
// thrown through an instrumented provider, so no message may hold a value
// (R10, plan Risks 7). None of these errors has a `cause`.

export class RecordFormIdInvalidError extends DomainError {
  readonly code = 'formId.invalid';
  readonly status = HttpStatus.BAD_REQUEST;
  readonly field = 'formId';

  constructor() {
    super('record error: formId.invalid');
  }
}

export class RecordFormTypeMismatchError extends DomainError {
  readonly code = 'formType.mismatch';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field = 'formId';

  constructor() {
    super('record error: formType.mismatch');
  }
}

export class RecordFormArchivedError extends DomainError {
  readonly code = 'form.archived';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'formId';

  constructor() {
    super('record error: form.archived');
  }
}

export class RecordFormChangedError extends DomainError {
  readonly code = 'record.form-changed';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'formVersion';

  constructor() {
    super('record error: record.form-changed');
  }
}

export class RecordRevisionConflictError extends DomainError {
  readonly code = 'record.revision-conflict';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'revision';

  constructor() {
    super('record error: record.revision-conflict');
  }
}

/** A well-formed field id that the record's version does not have (400). */
export class RecordValueUnknownFieldError extends DomainError {
  readonly code = 'value.unknown-field';
  readonly status = HttpStatus.BAD_REQUEST;
  readonly field: string;

  constructor(fieldId: string) {
    super('record error: value.unknown-field');
    this.field = `values.${fieldId}`;
  }
}

/**
 * The record does not exist for this tenant. The caller (SPEC-0004 or
 * SPEC-0005) turns it into its own 404 `client.not-found` or
 * `service.not-found`.
 */
export class RecordNotFoundError extends DomainError {
  readonly code = 'record.not-found';
  readonly status = HttpStatus.NOT_FOUND;

  constructor() {
    super('record error: record.not-found');
  }
}

/**
 * A stored value failed to decrypt or parse. The cipher's own errors are not
 * passed on: a JSON.parse SyntaxError quotes the plaintext.
 */
export class RecordValueUnreadableError extends DomainError {
  readonly code = 'record.value-unreadable';
  readonly status = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor() {
    super('record error: record.value-unreadable');
  }
}
