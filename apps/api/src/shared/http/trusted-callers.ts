import { isIP } from 'node:net';
import type { INestApplication } from '@nestjs/common';

// SPEC-0009 R5: only the web app may state the client address. TRUSTED_CALLERS
// lists the callers that count as the web app: `loopback`, IP addresses or
// CIDRs, comma-separated. Express then takes `request.ip` from X-Forwarded-For
// only on connections from those callers, and from the socket otherwise.

const LOOPBACK = 'loopback';

function isTrustedEntry(entry: string): boolean {
  if (entry === LOOPBACK) return true;

  const [address = '', prefix, ...rest] = entry.split('/');
  const version = isIP(address);

  if (version === 0 || rest.length > 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;

  return Number(prefix) <= (version === 4 ? 32 : 128);
}

export function parseTrustedCallers(value: string): string[] {
  const entries = value.split(',').map((entry) => entry.trim());
  const invalid = entries.find((entry) => !isTrustedEntry(entry));

  if (invalid !== undefined) {
    throw new Error(
      `TRUSTED_CALLERS accepts loopback, IP addresses and CIDRs; got "${invalid}"`,
    );
  }

  return entries;
}

export function applyTrustedCallers(
  app: INestApplication,
  value: string,
): void {
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', parseTrustedCallers(value));
}
