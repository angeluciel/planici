import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * SHA-256 rather than bcrypt cuz these're already high-entropy
 * so using bcrypt would cost a hash on every refresh
 * */

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function secretsMatch(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashSecret(candidate), 'hex');
  const b = Buffer.from(storedHash, 'hex');

  return a.length === b.length && timingSafeEqual(a, b);
}
