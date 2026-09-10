import { EmailSchema } from '@planici/schemas';
import { ValidationError } from '@/shared/http/zod-validation.pipe.js';

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const result = EmailSchema.safeParse(raw);
    if (!result.success)
      throw new ValidationError(
        result.error.issues[0]?.message ?? 'email.invalid',
        'email',
      );
    return new Email(result.data);
  }

  toString(): string {
    return this.value;
  }
}
