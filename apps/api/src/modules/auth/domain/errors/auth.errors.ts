import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/errors/domain.error.js';

export class EmailTakenError extends DomainError {
  readonly code = 'email.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'email';
}

export class SlugTakenError extends DomainError {
  readonly code = 'slug.taken';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'slug';
}

export class InvalidCredentialsError extends DomainError {
  readonly code = '';
  readonly status = HttpStatus.UNAUTHORIZED;
  readonly field = 'password';
}

export class AccountLockedError extends DomainError {
  readonly code = 'account.locked';
  readonly sttus = HttpStatus.TOO_MANY_REQUESTS;
}

export class AccountInactiveError extends DomainError {
  readonly code = 'account.inactive';
  readonly status = HttpStatus.FORBIDDEN;
}

/** Google-only account trying the password form. */
export class NoPasswordSetError extends DomainError {
  readonly code = 'account.no-password';
  readonly status = HttpStatus.CONFLICT;
  readonly field = 'password';
}

export class InvalidCodeError extends DomainError {
  readonly code = 'code.invalid';
  readonly field = 'code';
}

export class ExpiredCodeError extends DomainError {
  readonly code = 'code.expired';
  readonly field = 'code';
}

export class TooManyCodeAttemptsError extends DomainError {
  readonly code = 'code.attempts';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;
  readonly field = 'code';
}

export class CodeRateLimitedError extends DomainError {
  readonly code = 'code.rate-limited';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;
}

export class InvalidTokenError extends DomainError {
  readonly code = 'token.invalid';
  readonly status = HttpStatus.UNAUTHORIZED;
}

export class ExpiredTokenError extends DomainError {
  readonly code = 'token.expired';
  readonly status = HttpStatus.UNAUTHORIZED;
}

export class GoogleUnavailableError extends DomainError {
  readonly code = 'google.unavailable';
  readonly status = HttpStatus.SERVICE_UNAVAILABLE;
}

export class GoogleInvalidTokenError extends DomainError {
  readonly code = 'google.invalid';
  readonly status = HttpStatus.UNAUTHORIZED;
}
