import type { ZodType } from 'zod';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';

/** Parses `value` with a shared schema; the first issue becomes a 422 keyed by its message. */
export function parseOrThrow<T extends ZodType>(
  schema: T,
  value: unknown,
): T['_output'] {
  const result = schema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];

    throw new ValidationError(
      issue?.message ?? 'unexpected',
      issue?.path.join('.') || undefined,
    );
  }

  return result.data;
}
