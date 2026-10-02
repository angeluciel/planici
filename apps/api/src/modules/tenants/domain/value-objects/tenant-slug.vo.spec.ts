import { describe, expect, it } from 'vitest';
import { ValidationError } from '@shared/http/zod-validation.pipe.js';
import { TenantName } from './tenant-name.vo.js';
import { TenantSlug } from './tenant-slug.vo.js';

describe('TenantSlug', () => {
  it('normalises case and surrounding whitespace', () => {
    expect(TenantSlug.create('  Studio-Ana ').value).toBe('studio-ana');
  });

  it.each([
    ['', 'tenantSlug.required'],
    ['studio ana', 'tenantSlug.pattern'],
    ['-studio', 'tenantSlug.pattern'],
    ['a'.repeat(49), 'tenantSlug.max'],
  ])('rejects %j with %s', (raw, code) => {
    expect(() => TenantSlug.create(raw)).toThrow(
      expect.objectContaining({ code, field: 'slug' }),
    );
  });
});

describe('TenantName', () => {
  it('collapses whitespace', () => {
    expect(TenantName.create('  Studio   Ana ').value).toBe('Studio Ana');
  });

  it('rejects a blank name', () => {
    expect(() => TenantName.create('   ')).toThrow(ValidationError);
  });

  it('rejects a name over the limit', () => {
    expect(() => TenantName.create('a'.repeat(81))).toThrow(
      expect.objectContaining({ code: 'tenantName.max' }),
    );
  });
});
