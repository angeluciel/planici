import { TENANT_ID_PATTERN, TenantIdSchema } from '@planici/schemas';
import { describe, expect, it } from 'vitest';
import { createTenantId } from './tenant-id.js';

describe('createTenantId', () => {
  it('prefixes a 10 char lowercase suffix with the slug', () => {
    const id = createTenantId('studio-ana');

    expect(id).toMatch(/^studio-ana-[0-9a-z]{10}$/);
    expect(id).toMatch(TENANT_ID_PATTERN);
  });

  it('fits the shared schema for the longest slug', () => {
    const id = createTenantId('a'.repeat(48));

    expect(TenantIdSchema.safeParse(id).success).toBe(true);
  });

  it('does not repeat', () => {
    const ids = new Set(
      Array.from({ length: 1000 }, () => createTenantId('studio')),
    );

    expect(ids.size).toBe(1000);
  });
});
