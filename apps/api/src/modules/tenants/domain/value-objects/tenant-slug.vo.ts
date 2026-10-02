import { SLUG_PATTERN, TENANT_SLUG_MAX_LENGTH } from '@planici/schemas';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';

export class TenantSlug {
  private constructor(readonly value: string) {}

  static create(raw: string): TenantSlug {
    const normalised = raw.trim().toLowerCase();

    if (!normalised) throw new ValidationError('tenantSlug.required', 'slug');
    if (normalised.length > TENANT_SLUG_MAX_LENGTH)
      throw new ValidationError('tenantSlug.max', 'slug');
    if (!SLUG_PATTERN.test(normalised))
      throw new ValidationError('tenantSlug.pattern', 'slug');

    return new TenantSlug(normalised);
  }

  toString(): string {
    return this.value;
  }
}
