import { PasswordSchema } from '@planici/schemas';
import { ValidationError } from '@/shared/http/zod-validation.pipe.js';

export class Password {
  private constructor(private readonly plain: string) {}

  static create(raw: string): Password {
    const result = PasswordSchema.safeParse(raw);
    if (!result.success)
      throw new ValidationError(
        result.error.issues[0]?.message ?? 'password.min',
        'password',
      );
    return new Password(result.data);
  }

  expose(): string {
    return this.plain;
  }

  /** to be kept out of logs and error dumps */
  toJSON(): string {
    return '[REDACTED]';
  }
  toString(): string {
    return '[REDACTED]';
  }
}
