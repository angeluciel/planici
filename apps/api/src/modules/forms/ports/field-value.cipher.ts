export const FIELD_VALUE_CIPHER = Symbol('FIELD_VALUE_CIPHER');

import type { FieldValueContext } from '@shared/crypto/field-value.cipher.js';

export type { FieldValueContext };

/**
 * Encrypts one custom-field value (SPEC-0003 R11). The plaintext is the UTF-8
 * JSON of the normalised contract value. Implemented by the shared
 * AES-256-GCM cipher in `@shared/crypto/field-value.cipher.ts`.
 */
export interface FieldValueCipher {
  encrypt(value: unknown, context: FieldValueContext): Buffer;

  /** Throws when the ciphertext or any part of the context does not match. */
  decrypt(ciphertext: Buffer, context: FieldValueContext): unknown;
}
