import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** The MVP has one key. Rotation (a second key, re-encrypting rows) is post-MVP. */
export const CURRENT_FIELD_VALUE_KEY_VERSION = 1;

const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Ids that bind a ciphertext to its place. They are the GCM associated data, so
 * a value copied to another record, field or tenant fails authentication.
 */
export type FieldValueContext = {
  keyVersion: number;
  tenantId: string;
  formRecordId: string;
  fieldId: string;
};

/**
 * AES-256-GCM for form record values (SPEC-0003 R11). The plaintext is the
 * UTF-8 JSON of the normalised contract value. The stored bytes are
 * `nonce (12) || ciphertext || auth tag (16)`, with a new random nonce each time.
 */
export class FieldValueCipher {
  private readonly key: Buffer;

  /** @param keyBase64 `FIELD_VALUES_KEY`: 32 random bytes, base64. */
  constructor(keyBase64: string) {
    this.key = Buffer.from(keyBase64, 'base64');
    if (this.key.length !== KEY_BYTES) {
      throw new Error(`field value key must be ${KEY_BYTES} bytes`);
    }
  }

  encrypt(value: unknown, context: FieldValueContext): Buffer {
    this.assertKeyVersion(context.keyVersion);
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(associatedData(context));
    const body = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, body, cipher.getAuthTag()]);
  }

  decrypt(sealed: Buffer, context: FieldValueContext): unknown {
    this.assertKeyVersion(context.keyVersion);
    if (sealed.length < NONCE_BYTES + TAG_BYTES) {
      throw new Error('field value ciphertext is too short');
    }
    const nonce = sealed.subarray(0, NONCE_BYTES);
    const tag = sealed.subarray(sealed.length - TAG_BYTES);
    const body = sealed.subarray(NONCE_BYTES, sealed.length - TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, nonce);
    decipher.setAAD(associatedData(context));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]);
    return JSON.parse(plain.toString('utf8')) as unknown;
  }

  private assertKeyVersion(keyVersion: number): void {
    if (keyVersion !== CURRENT_FIELD_VALUE_KEY_VERSION) {
      throw new Error(`unknown field value key version: ${keyVersion}`);
    }
  }
}

/** Fixed format: `<key_version>|<tenant_id>|<form_record_id>|<field_id>`. */
function associatedData(context: FieldValueContext): Buffer {
  return Buffer.from(
    [
      context.keyVersion,
      context.tenantId,
      context.formRecordId,
      context.fieldId,
    ].join('|'),
    'utf8',
  );
}
