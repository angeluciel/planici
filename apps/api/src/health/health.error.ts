import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@src/shared/errors/domain.error.js';

export class HealthCheckError extends DomainError {
  readonly code = 'Failed to SELECT from database';
  readonly status = HttpStatus.SERVICE_UNAVAILABLE;
}
