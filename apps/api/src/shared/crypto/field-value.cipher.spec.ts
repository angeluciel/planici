import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_FIELD_VALUE_KEY_VERSION,
  FieldValueCipher,
  type FieldValueContext,
} from './field-value.cipher.js';

const key = () => randomBytes(32).toString('base64');

const context: FieldValueContext = {
  keyVersion: CURRENT_FIELD_VALUE_KEY_VERSION,
  tenantId: 'studio-ana-4f9k2m7x1q',
  formRecordId: '0b0f7d5e-6a53-4e0a-9d52-1d8e5f3c2a11',
  fieldId: '7c1c2d1e-0e4a-4a1b-8b57-0a8f6d2d9b33',
};

describe('FieldValueCipher (U-ciph)', () => {
  const cipher = new FieldValueCipher(key());

  it('round-trips JSON values of every contract shape', () => {
    for (const value of [
      'Maria da Silva',
      true,
      12.5,
      null,
      'opt-1',
      { cep: '01001000', numero: '10' },
    ]) {
      const sealed = cipher.encrypt(value, context);
      expect(cipher.decrypt(sealed, context)).toEqual(value);
    }
  });

  it('uses a new random nonce for every value', () => {
    const a = cipher.encrypt('same', context);
    const b = cipher.encrypt('same', context);
    expect(a.equals(b)).toBe(false);
    expect(a.subarray(0, 12).equals(b.subarray(0, 12))).toBe(false);
  });

  it('does not contain the plaintext', () => {
    const sealed = cipher.encrypt('segredo-clinico', context);
    expect(sealed.includes(Buffer.from('segredo-clinico'))).toBe(false);
  });

  it('fails when the ciphertext was changed', () => {
    const sealed = cipher.encrypt('abc', context);
    for (const index of [0, 12, sealed.length - 1]) {
      const tampered = Buffer.from(sealed);
      tampered[index] ^= 0x01;
      expect(() => cipher.decrypt(tampered, context)).toThrow();
    }
  });

  it('fails when the ciphertext is too short', () => {
    expect(() => cipher.decrypt(Buffer.alloc(10), context)).toThrow();
  });

  it.each([
    ['tenant', { tenantId: 'studio-bia-9z8y7x6w5v' }],
    ['record', { formRecordId: '11111111-6a53-4e0a-9d52-1d8e5f3c2a11' }],
    ['field', { fieldId: '22222222-0e4a-4a1b-8b57-0a8f6d2d9b33' }],
  ])('fails when decrypted with another %s', (_name, override) => {
    const sealed = cipher.encrypt('abc', context);
    expect(() => cipher.decrypt(sealed, { ...context, ...override })).toThrow();
  });

  it('fails when decrypted with another key version', () => {
    const sealed = cipher.encrypt('abc', context);
    expect(() =>
      cipher.decrypt(sealed, { ...context, keyVersion: 2 }),
    ).toThrow();
  });

  it('fails when decrypted with another key', () => {
    const sealed = cipher.encrypt('abc', context);
    expect(() =>
      new FieldValueCipher(key()).decrypt(sealed, context),
    ).toThrow();
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(
      () => new FieldValueCipher(randomBytes(16).toString('base64')),
    ).toThrow();
  });
});
