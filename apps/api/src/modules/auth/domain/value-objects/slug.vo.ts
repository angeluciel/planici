import { ValidationError } from '@/shared/http/zod-validation.pipe.js';
import { SLUG_PATTERN } from '@planici/schemas';

export class Slug {
  private constructor(readonly value: string) {}

  static create(raw: string): Slug {
    const normalised = raw.trim().toLowerCase();

    if (!normalised) throw new ValidationError('slug.required', 'slug');
    if (!SLUG_PATTERN.test(normalised))
      throw new ValidationError('slug.pattern', 'slug');

    return new Slug(normalised);
  }

  toString(): string {
    return this.value;
  }
}
