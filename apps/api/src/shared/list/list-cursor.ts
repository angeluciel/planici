import { createHmac, timingSafeEqual } from 'node:crypto';

// The list cursor of SPEC-0004 plan, API, List, as amended by SPEC-0006 plan,
// API: `<payload>.<mac>`, both base64url. The payload is the JSON { f, k, i }:
// `f` the filter and sort the cursor was issued for, `k` and `i` the sort key
// and `id` of the last row. The key is the row's `name_key` for the name sorts
// and its exact `updated_at` text, microseconds included, for `-updatedAt`
// (SPEC-0006 plan, G-6). The mac is HMAC-SHA256 of the payload string, so an
// edit of any of them fails the check.

// The key context names the list: each module derives its own key, so a cursor
// of one list never decodes in another (SPEC-0005 G-2). Clients use
// 'planici:list-cursor:v1', services 'planici:services-cursor:v1'.

export type CursorFilter<Sort extends string = string> = {
  status: 'active' | 'inactive' | 'all';
  // textKey of the search query, '' when there is none
  q: string;
  // the template filter, '' when there is none (SPEC-0006 R5)
  formId: string;
  sort: Sort;
};

export type CursorPosition = {
  key: string;
  id: string;
};

/** Derives the signing key: the JWT secret itself never signs a cursor. */
export function deriveCursorKey(secret: string, context: string): Buffer {
  return createHmac('sha256', secret).update(context).digest();
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
      f: {
        status: filter.status,
        q: filter.q,
        formId: filter.formId,
        sort: filter.sort,
      },
      k: last.key,
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
 * signed with `key`, or was issued for another filter or sort (-> 422
 * `cursor.invalid`).
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

  const { f, k, i } = data;

  if (
    typeof f.status !== 'string' ||
    typeof f.q !== 'string' ||
    typeof f.formId !== 'string' ||
    typeof f.sort !== 'string'
  ) {
    return null;
  }
  if (typeof k !== 'string' || typeof i !== 'string') return null;
  if (
    f.status !== filter.status ||
    f.q !== filter.q ||
    f.formId !== filter.formId ||
    f.sort !== filter.sort
  ) {
    return null;
  }

  return { key: k, id: i };
}
