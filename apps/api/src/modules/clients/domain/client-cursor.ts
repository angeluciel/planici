import { createHmac, timingSafeEqual } from 'node:crypto';

// The list cursor of SPEC-0004 plan, API, List: `<payload>.<mac>`, both
// base64url. The payload is the JSON { f, n, i }: `f` the filter the cursor was
// issued for, `n` and `i` the `name_key` and `id` of the last row. The mac is
// HMAC-SHA256 of the payload string, so an edit of any of them fails the check.

const KEY_CONTEXT = 'planici:list-cursor:v1';

export type CursorFilter = {
  status: 'active' | 'inactive' | 'all';
  // textKey of the search query, '' when there is none
  q: string;
};

export type CursorPosition = {
  nameKey: string;
  id: string;
};

/** Derives the signing key: the JWT secret itself never signs a cursor. */
export function deriveCursorKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(KEY_CONTEXT).digest();
}

function sign(key: Buffer, payload: string): Buffer {
  return createHmac('sha256', key).update(payload).digest();
}

export function encodeCursor(
  key: Buffer,
  filter: CursorFilter,
  last: CursorPosition,
): string {
  const payload = Buffer.from(
    JSON.stringify({
      f: { status: filter.status, q: filter.q },
      n: last.nameKey,
      i: last.id,
    }),
  ).toString('base64url');

  return `${payload}.${sign(key, payload).toString('base64url')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The position a cursor stands for, or null when it is malformed, was not
 * signed with `key`, or was issued for another filter (-> 422 `cursor.invalid`).
 */
export function decodeCursor(
  key: Buffer,
  cursor: string,
  filter: CursorFilter,
): CursorPosition | null {
  const parts = cursor.split('.');

  if (parts.length !== 2) return null;

  const [payload, mac] = parts as [string, string];

  if (payload === '' || mac === '') return null;

  const given = Buffer.from(mac, 'base64url');
  const expected = sign(key, payload);

  // lengths first: timingSafeEqual throws on different lengths
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  let data: unknown;

  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!isRecord(data) || !isRecord(data.f)) return null;

  const { f, n, i } = data;

  if (typeof f.status !== 'string' || typeof f.q !== 'string') return null;
  if (typeof n !== 'string' || typeof i !== 'string') return null;
  if (f.status !== filter.status || f.q !== filter.q) return null;

  return { nameKey: n, id: i };
}
