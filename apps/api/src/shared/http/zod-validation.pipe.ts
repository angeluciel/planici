import { HttpStatus, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { DomainError } from '@/shared/errors/domain.error.js';

export class ValidationError extends DomainError {
  readonly code: string;
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly field?: string;

  constructor(code: string, field?: string) {
    super(`validation failed: ${code}`);
    this.code = code;
    this.field = field;
  }
}

/**
 * Valida com o schema compartilhado com o frontend */

export class ZodBody<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): T['_output'] {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const issue = result.error.issues[0];

      throw new ValidationError(
        issue?.message ?? 'unexpected',
        issue?.path.join('.') || undefined,
      );
    }

    return result.data;
  }
}
