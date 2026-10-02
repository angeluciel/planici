import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@src/shared/errors/domain.error.js';

export class TenantSlugTakenError extends DomainError {
  readonly code = 'tenantSlug.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'slug';
}

export class TenantRequiredError extends DomainError {
  readonly code = 'tenant.required';
}

export class TenantNotFoundError extends DomainError {
  readonly code = 'tenant.not-found';
  readonly status = HttpStatus.NOT_FOUND;
}

export class TenantInactiveError extends DomainError {
  readonly code = 'tenant.inactive';
  readonly status = HttpStatus.FORBIDDEN;
}

export class TenantForbiddenError extends DomainError {
  readonly code = 'tenant.forbidden';
  readonly status = HttpStatus.FORBIDDEN;
}
