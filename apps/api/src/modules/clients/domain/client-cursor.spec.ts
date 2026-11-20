import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  decodeCursor,
  deriveCursorKey,
  encodeCursor,
  type CursorFilter,
} from './client-cursor.js';

// U-cur: the list cursor of SPEC-0004 plan, API, List. `<payload>.<mac>`, both
// base64url; the payload is { f, k, i } (SPEC-0006) and the mac covers it.

const key = deriveCursorKey('test-secret-of-at-least-32-characters!!');
const otherKey = deriveCursorKey('another-secret-of-at-least-32-chars!!');

const filter: CursorFilter = {
  status: 'active',
  q: 'ana',
  formId: '',
  sort: 'name',
};
const last = {
  key: 'ana souza',
  id: '0b0f4c52-2a58-4a64-9a3e-7d3f3a5f8d10',
};

const b64 = (value: string) => Buffer.from(value).toString('base64url');
const fromB64 = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

// the payload object of a cursor
const payloadOf = (cursor: string) =>
  JSON.parse(fromB64(cursor.split('.')[0]!)) as Record<string, unknown>;

// a cursor whose payload was edited but whose mac is the old one
const editedWithOldMac = (cursor: string, edit: (p: any) => void) => {
  const [, mac] = cursor.split('.');
  const payload = payloadOf(cursor);
  edit(payload);
  return `${b64(JSON.stringify(payload))}.${mac}`;
};

describe('key', () => {
  it('derives a stable 32-byte key per secret', () => {
    expect(deriveCursorKey('a-secret').length).toBe(32);
    expect(
      deriveCursorKey('a-secret').equals(deriveCursorKey('a-secret')),
    ).toBe(true);
    expect(
      deriveCursorKey('a-secret').equals(deriveCursorKey('b-secret')),
    ).toBe(false);
  });
});

describe('encode and decode', () => {
  it('AC-0004-21 round-trips the last row', () => {
    const cursor = encodeCursor(key, filter, last);

    expect(decodeCursor(key, cursor, filter)).toEqual(last);
  });

  it('writes <payload>.<mac> in base64url with the payload { f, k, i }', () => {
    const cursor = encodeCursor(key, filter, last);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(payloadOf(cursor)).toEqual({
      f: { status: 'active', q: 'ana', formId: '', sort: 'name' },
      k: last.key,
      i: last.id,
    });
  });

  it('round-trips names with accents, dots and quotes', () => {
    const row = { key: 'o.\'brien "x" ünï', id: last.id };
    const cursor = encodeCursor(key, filter, row);

    expect(decodeCursor(key, cursor, filter)).toEqual(row);
  });

  it('binds the cursor to its filter', () => {
    const all: CursorFilter = {
      status: 'all',
      q: '',
      formId: '',
      sort: 'name',
    };
    const cursor = encodeCursor(key, all, last);

    expect(decodeCursor(key, cursor, all)).toEqual(last);
  });

  it('G-6 round-trips the exact microsecond text of a -updatedAt position', () => {
    const byUpdate: CursorFilter = { ...filter, sort: '-updatedAt' };
    const row = { key: '2026-11-18T15:30:00.123456Z', id: last.id };
    const cursor = encodeCursor(key, byUpdate, row);

    expect(decodeCursor(key, cursor, byUpdate)).toEqual(row);
  });
});

describe('invalid cursors', () => {
  const cursor = encodeCursor(key, filter, last);

  it('AC-0004-23 rejects a cursor issued for another q', () => {
    expect(decodeCursor(key, cursor, { ...filter, q: 'bruno' })).toBeNull();
  });

  it('rejects a cursor issued for another status or no q', () => {
    expect(decodeCursor(key, cursor, { ...filter, status: 'all' })).toBeNull();
    expect(decodeCursor(key, cursor, { ...filter, q: '' })).toBeNull();
  });

  it('AC-0006-34 rejects a cursor issued for another template filter', () => {
    const anamnese = {
      ...filter,
      formId: 'a'.repeat(8) + '-0000-4000-8000-000000000001',
    };
    const ficha = {
      ...filter,
      formId: 'b'.repeat(8) + '-0000-4000-8000-000000000002',
    };
    const withTemplate = encodeCursor(key, anamnese, last);

    expect(decodeCursor(key, withTemplate, anamnese)).toEqual(last);
    expect(decodeCursor(key, withTemplate, ficha)).toBeNull();
    // no template filter is '' and differs from any template
    expect(decodeCursor(key, withTemplate, filter)).toBeNull();
    expect(decodeCursor(key, cursor, anamnese)).toBeNull();
  });

  it('AC-0006-26 rejects a cursor issued for another sort', () => {
    for (const other of ['-name', '-updatedAt'] as const) {
      expect(decodeCursor(key, cursor, { ...filter, sort: other })).toBeNull();
    }
    const byUpdate = encodeCursor(key, { ...filter, sort: '-updatedAt' }, last);
    expect(decodeCursor(key, byUpdate, filter)).toBeNull();
    expect(
      decodeCursor(key, byUpdate, { ...filter, sort: '-name' }),
    ).toBeNull();
  });

  it('rejects an edited k with the old mac', () => {
    const edited = editedWithOldMac(cursor, (p) => {
      p.k = 'zzz';
    });

    expect(decodeCursor(key, edited, filter)).toBeNull();
  });

  it('rejects an edited i with the old mac', () => {
    const edited = editedWithOldMac(cursor, (p) => {
      p.i = '00000000-0000-4000-8000-000000000000';
    });

    expect(decodeCursor(key, edited, filter)).toBeNull();
  });

  it('rejects an edited f with the old mac, even if it now matches the request', () => {
    const edited = editedWithOldMac(cursor, (p) => {
      p.f = { ...p.f, q: 'bruno' };
    });

    expect(decodeCursor(key, edited, { ...filter, q: 'bruno' })).toBeNull();
  });

  it('rejects a wrong mac', () => {
    const [payload] = cursor.split('.');
    const forged = `${payload}.${encodeCursor(otherKey, filter, last).split('.')[1]}`;

    expect(decodeCursor(key, forged, filter)).toBeNull();
  });

  it('rejects a cursor signed with another key', () => {
    expect(
      decodeCursor(key, encodeCursor(otherKey, filter, last), filter),
    ).toBeNull();
  });

  it('rejects a cursor missing a part', () => {
    const [payload, mac] = cursor.split('.');

    expect(decodeCursor(key, payload!, filter)).toBeNull();
    expect(decodeCursor(key, `${payload}.`, filter)).toBeNull();
    expect(decodeCursor(key, `.${mac}`, filter)).toBeNull();
    expect(decodeCursor(key, '', filter)).toBeNull();
    expect(decodeCursor(key, '.', filter)).toBeNull();
  });

  it('rejects a cursor with extra parts', () => {
    expect(decodeCursor(key, `${cursor}.x`, filter)).toBeNull();
  });

  it('rejects garbage', () => {
    for (const garbage of ['abc', 'a.b', '%%%.%%%', 'eyJ9.eyJ9', ' ']) {
      expect(decodeCursor(key, garbage, filter)).toBeNull();
    }
  });

  it('rejects a mac of the wrong length without throwing', () => {
    const [payload, mac] = cursor.split('.');

    expect(decodeCursor(key, `${payload}.${mac!.slice(1)}`, filter)).toBeNull();
    expect(decodeCursor(key, `${payload}.${mac}AA`, filter)).toBeNull();
  });

  it('rejects a correctly signed payload that has the wrong shape', () => {
    const f = { status: 'active', q: 'ana', formId: '', sort: 'name' };
    const sign = (value: unknown) => {
      // sign through the real encoder's mac: reuse encode on a doctored row
      const payload = b64(JSON.stringify(value));
      const { mac } = signRaw(payload);
      return `${payload}.${mac}`;
    };

    for (const value of [
      { f: filter, k: 1, i: last.id },
      { f: filter, k: last.key },
      { k: last.key, i: last.id },
      { f: 'active', k: last.key, i: last.id },
      { f: { ...filter, status: 1 }, k: last.key, i: last.id },
      // a cursor of the shape before SPEC-0006: no formId, no sort, `n` for the key
      { f: { status: 'active', q: 'ana' }, k: last.key, i: last.id },
      { f, n: last.key, i: last.id },
      { f: { ...filter, formId: 1 }, k: last.key, i: last.id },
      { f: { ...filter, sort: 1 }, k: last.key, i: last.id },
      [],
      null,
      'text',
    ]) {
      expect(decodeCursor(key, sign(value), filter)).toBeNull();
    }
  });
});

// HMAC-SHA256 of the payload string under the test key, the documented mac
function signRaw(payload: string) {
  return { mac: createHmac('sha256', key).update(payload).digest('base64url') };
}
