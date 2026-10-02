import {
  TENANT_ID_SUFFIX_ALPHABET,
  TENANT_ID_SUFFIX_LENGTH,
} from '@planici/schemas';
import { customAlphabet } from 'nanoid';

const suffix = customAlphabet(
  TENANT_ID_SUFFIX_ALPHABET,
  TENANT_ID_SUFFIX_LENGTH,
);

export function createDefaultId(prefix: string): string {
  return `${prefix}-${suffix()}`;
}

export function createTenantId(slug: string): string {
  return createDefaultId(slug);
}
