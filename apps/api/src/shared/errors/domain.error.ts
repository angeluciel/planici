import { HttpStatus } from '@nestjs/common';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly status: HttpStatus = HttpStatus.BAD_REQUEST;
  readonly field?: string;

  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
