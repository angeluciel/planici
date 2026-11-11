import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@shared/errors/domain.error.js';

// Error keys and statuses of SPEC-0001 section 6 and SPEC-0002 section 6.

export class FormNotFoundError extends DomainError {
  readonly code = 'form.not-found';
  readonly status = HttpStatus.NOT_FOUND;
}

export class FormVersionNotFoundError extends DomainError {
  readonly code = 'formVersion.not-found';
  readonly status = HttpStatus.NOT_FOUND;
}

export class FormNameTakenError extends DomainError {
  readonly code = 'formName.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'name';
}

export class FormLimitReachedError extends DomainError {
  readonly code = 'form.limit-reached';
}

export class FormRevisionConflictError extends DomainError {
  readonly code = 'form.revision-conflict';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'revision';
}

export class MigrationModeRequiredError extends DomainError {
  readonly code = 'migration.mode-required';
  readonly field = 'migration.mode';
}

export class MigrationConfirmationRequiredError extends DomainError {
  readonly code = 'migration.confirmation-required';
  readonly field = 'migration.confirmName';
}

export class DeleteConfirmationRequiredError extends DomainError {
  readonly code = 'deleteConfirmation.required';
  readonly field = 'confirmName';
}

export class FormInUseError extends DomainError {
  readonly code = 'form.in-use';
  readonly status = HttpStatus.CONFLICT;
}

export class FormRecordsHaveHistoryError extends DomainError {
  readonly code = 'form.records-have-history';
  readonly status = HttpStatus.CONFLICT;
}

export class FormStatusUnchangedError extends DomainError {
  readonly code = 'form.status-unchanged';
  readonly status = HttpStatus.CONFLICT;
}

// field-level errors the FieldPolicy raises (SPEC-0002 section 6)

export class SystemFieldMissingError extends DomainError {
  readonly code = 'systemField.missing';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field = 'fields';
}

export class SystemFieldLockedError extends DomainError {
  readonly code = 'systemField.locked';
  readonly field: string;

  constructor(
    index: number,
    readonly status: HttpStatus,
  ) {
    super();
    this.field = `fields.${index}`;
  }
}

export class FieldUnknownError extends DomainError {
  readonly code = 'field.unknown';
  readonly field: string;

  constructor(index: number) {
    super();
    this.field = `fields.${index}.id`;
  }
}

export class FieldIdDuplicateError extends DomainError {
  readonly code = 'fieldId.duplicate';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field: string;

  constructor(index: number) {
    super();
    this.field = `fields.${index}.id`;
  }
}

export class FieldTypeImmutableError extends DomainError {
  readonly code = 'fieldType.immutable';
  readonly field: string;

  constructor(index: number) {
    super();
    this.field = `fields.${index}.type`;
  }
}

export class FieldSystemKeyNotAllowedError extends DomainError {
  readonly code = 'fieldSystemKey.not-allowed';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field: string;

  constructor(index: number) {
    super();
    this.field = `fields.${index}.systemKey`;
  }
}

export class FieldOptionIdUnknownError extends DomainError {
  readonly code = 'fieldOptionId.unknown';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field: string;

  constructor(fieldIndex: number, optionIndex: number) {
    super();
    this.field = `fields.${fieldIndex}.options.${optionIndex}.id`;
  }
}
