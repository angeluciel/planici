import { TENANT_NAME_MAX_LENGTH } from '@planici/schemas';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';

export class TenantName {
  private constructor(readonly value: string) {}

  static create(raw: string): TenantName {
    const normalised = raw.trim().replace(/\s+/g, ' ');

    if (!normalised) throw new ValidationError('tenantName.required', 'name');
    if (normalised.length > TENANT_NAME_MAX_LENGTH)
      throw new ValidationError('tenantName.max', 'name');

    return new TenantName(normalised);
  }

  toString(): string {
    return this.value;
  }
}
