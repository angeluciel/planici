import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_CONSENT_TEXT_VERSION,
  CLIENT_ERROR_CODES,
  ClientAttributesSchema,
  ClientConsentCreateSchema,
  ClientConsentUpdateSchema,
  ClientCreateRequestSchema,
  ClientEmailSchema,
  ClientIdSchema,
  ClientNameSchema,
  ClientPhoneSchema,
  ClientUpdateRequestSchema,
  CursorQuerySchema,
  DeleteClientRequestSchema,
  LimitQuerySchema,
  ListClientsQuerySchema,
} from '@planici/schemas';
import type { ZodType } from 'zod';
import { ValidationError, ZodBody } from '@shared/http/zod-validation.pipe.js';

// U-req: the client schemas of packages/schemas through ZodBody, the pipe the
// controllers use (SPEC-0004 §6, §7 and plan, Contracts).

type First = { status: number; code: string; field: string | undefined };

// what the pipe throws for the first issue; fails when the body is accepted
function reject(schema: ZodType, body: unknown): First {
  try {
    new ZodBody(schema).transform(body);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: error.status, code: error.code, field: error.field };
    }
    throw error;
  }
  throw new Error('the body was accepted');
}

const parse = <T extends ZodType>(schema: T, body: unknown): T['_output'] =>
  new ZodBody(schema).transform(body);

const expected = (code: string, field: string): First => ({
  status: 422,
  code,
  field,
});

describe('constants and error codes', () => {
  it('the current consent text version is "1"', () => {
    expect(CLIENT_CONSENT_TEXT_VERSION).toBe('1');
  });

  it('lists the client error codes of §6, each once', () => {
    expect(CLIENT_ERROR_CODES).toEqual([
      'consentAttested.required',
      'consentTextVersion.required',
      'consentText.outdated',
      'consentAttested.not-allowed',
      'consentTextVersion.not-allowed',
      'clientName.required',
      'clientName.max',
      'phone.required',
      'clientEmail.taken',
      'client.not-found',
      'client.has-history',
      'client.status-unchanged',
      'clientSearch.min',
      'clientStatus.invalid',
      'limit.invalid',
      'cursor.invalid',
      'clientSort.invalid',
    ]);
  });
});

describe('client id', () => {
  it('accepts a uuid', () => {
    const id = randomUUID();
    expect(ClientIdSchema.parse(id)).toBe(id);
  });

  it('AC-0004-73 rejects a malformed id with client.not-found', () => {
    const result = ClientIdSchema.safeParse('abc');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('client.not-found');
  });
});

describe('name', () => {
  it('R2 trims and collapses repeated spaces', () => {
    expect(ClientNameSchema.parse('  Ana   Maria \t Souza ')).toBe(
      'Ana Maria Souza',
    );
  });

  it('AC-0004-05 rejects a blank name', () => {
    expect(
      reject(ClientAttributesSchema, { name: '   ', email: 'a@b.co' }),
    ).toEqual(expected('clientName.required', 'name'));
    expect(
      reject(ClientAttributesSchema, { name: '', email: 'a@b.co' }),
    ).toEqual(expected('clientName.required', 'name'));
  });

  it('rejects a missing or non-string name as required', () => {
    expect(reject(ClientAttributesSchema, { email: 'a@b.co' })).toEqual(
      expected('clientName.required', 'name'),
    );
    expect(
      reject(ClientAttributesSchema, { name: 7, email: 'a@b.co' }),
    ).toEqual(expected('clientName.required', 'name'));
  });

  it('AC-0004-37 accepts 120 characters and rejects 121', () => {
    expect(ClientNameSchema.parse('a'.repeat(120))).toBe('a'.repeat(120));
    expect(
      reject(ClientAttributesSchema, {
        name: 'a'.repeat(121),
        email: 'a@b.co',
      }),
    ).toEqual(expected('clientName.max', 'name'));
  });

  it('counts the length after collapsing spaces', () => {
    const name = `${'a'.repeat(60)}     ${'b'.repeat(59)}`;
    expect(ClientNameSchema.parse(name)).toBe(
      `${'a'.repeat(60)} ${'b'.repeat(59)}`,
    );
  });
});

describe('e-mail', () => {
  it('R3 trims and lowercases', () => {
    expect(ClientEmailSchema.parse('  ANA@Example.com ')).toBe(
      'ana@example.com',
    );
  });

  it('AC-0004-06 rejects an invalid address', () => {
    expect(
      reject(ClientAttributesSchema, { name: 'Ana', email: 'ana@' }),
    ).toEqual(expected('email.invalid', 'email'));
  });

  it('AC-0004-38 rejects a blank or missing address as required', () => {
    expect(
      reject(ClientAttributesSchema, { name: 'Ana', email: '   ' }),
    ).toEqual(expected('email.required', 'email'));
    expect(reject(ClientAttributesSchema, { name: 'Ana' })).toEqual(
      expected('email.required', 'email'),
    );
  });
});

describe('phone', () => {
  it('R4 turns missing, null and blank into null', () => {
    expect(ClientPhoneSchema.parse(undefined)).toBeNull();
    expect(ClientPhoneSchema.parse(null)).toBeNull();
    expect(ClientPhoneSchema.parse('')).toBeNull();
    expect(ClientPhoneSchema.parse('   ')).toBeNull();
  });

  it('keeps digits only', () => {
    expect(ClientPhoneSchema.parse('(11) 98765-4321')).toBe('11987654321');
    expect(ClientPhoneSchema.parse('(11) 3456-7890')).toBe('1134567890');
  });

  it('attributes without phone give phone null', () => {
    expect(
      parse(ClientAttributesSchema, { name: 'Ana', email: 'ana@example.com' }),
    ).toEqual({ name: 'Ana', email: 'ana@example.com', phone: null });
  });

  it('AC-0004-39 rejects an invalid phone', () => {
    expect(
      reject(ClientAttributesSchema, {
        name: 'Ana',
        email: 'ana@example.com',
        phone: '(11) 8765-43210',
      }),
    ).toEqual(expected('phone.invalid', 'phone'));
  });

  it('rejects a phone that is not a string as phone.invalid', () => {
    expect(
      reject(ClientAttributesSchema, {
        name: 'Ana',
        email: 'ana@example.com',
        phone: 11987654321,
      }),
    ).toEqual(expected('phone.invalid', 'phone'));
  });
});

describe('attributes first-issue order', () => {
  it('§6 step 2 reports name, then e-mail, then phone', () => {
    expect(
      reject(ClientAttributesSchema, { name: '', email: 'x', phone: '1' }),
    ).toEqual(expected('clientName.required', 'name'));
    expect(
      reject(ClientAttributesSchema, { name: 'Ana', email: 'x', phone: '1' }),
    ).toEqual(expected('email.invalid', 'email'));
    expect(
      reject(ClientAttributesSchema, {
        name: 'Ana',
        email: 'ana@example.com',
        phone: '1',
      }),
    ).toEqual(expected('phone.invalid', 'phone'));
  });
});

describe('consent on create', () => {
  const valid = { consentAttested: true, consentTextVersion: '1' };

  it('accepts true with a version', () => {
    expect(parse(ClientConsentCreateSchema, valid)).toEqual(valid);
  });

  it('AC-0004-25 rejects a missing consentAttested', () => {
    expect(
      reject(ClientConsentCreateSchema, { consentTextVersion: '1' }),
    ).toEqual(expected('consentAttested.required', 'consentAttested'));
  });

  it('AC-0004-26 rejects consentAttested false', () => {
    expect(
      reject(ClientConsentCreateSchema, { ...valid, consentAttested: false }),
    ).toEqual(expected('consentAttested.required', 'consentAttested'));
  });

  it('rejects any value but the literal true', () => {
    for (const value of ['true', 1, null, {}]) {
      expect(
        reject(ClientConsentCreateSchema, { ...valid, consentAttested: value }),
      ).toEqual(expected('consentAttested.required', 'consentAttested'));
    }
  });

  it('AC-0004-56 rejects a missing consentTextVersion', () => {
    expect(
      reject(ClientConsentCreateSchema, { consentAttested: true }),
    ).toEqual(expected('consentTextVersion.required', 'consentTextVersion'));
  });

  it('rejects a blank or non-string consentTextVersion', () => {
    for (const value of ['', 1, null]) {
      expect(
        reject(ClientConsentCreateSchema, {
          ...valid,
          consentTextVersion: value,
        }),
      ).toEqual(expected('consentTextVersion.required', 'consentTextVersion'));
    }
  });

  it('AC-0004-58 reports consentAttested before the version', () => {
    expect(reject(ClientConsentCreateSchema, { name: '' })).toEqual(
      expected('consentAttested.required', 'consentAttested'),
    );
  });
});

describe('consent on update', () => {
  it('accepts a body without consent fields', () => {
    expect(() => parse(ClientConsentUpdateSchema, {})).not.toThrow();
  });

  it('AC-0004-28 rejects consentAttested', () => {
    for (const value of [true, false, null]) {
      expect(
        reject(ClientConsentUpdateSchema, { consentAttested: value }),
      ).toEqual(expected('consentAttested.not-allowed', 'consentAttested'));
    }
  });

  it('AC-0004-75 rejects consentTextVersion', () => {
    expect(
      reject(ClientConsentUpdateSchema, { consentTextVersion: '1' }),
    ).toEqual(expected('consentTextVersion.not-allowed', 'consentTextVersion'));
  });

  it('reports consentAttested before consentTextVersion', () => {
    expect(
      reject(ClientConsentUpdateSchema, {
        consentTextVersion: '1',
        consentAttested: true,
      }),
    ).toEqual(expected('consentAttested.not-allowed', 'consentAttested'));
  });
});

describe('create and update requests', () => {
  const create = () => ({
    formId: randomUUID(),
    formVersion: 1,
    values: {},
    consentAttested: true,
    consentTextVersion: '1',
    name: ' Ana  Souza ',
    email: 'ANA@example.com',
  });

  it('accepts a create body and normalises it', () => {
    const body = create();
    expect(parse(ClientCreateRequestSchema, body)).toMatchObject({
      formId: body.formId,
      name: 'Ana Souza',
      email: 'ana@example.com',
      phone: null,
      consentAttested: true,
      consentTextVersion: '1',
    });
  });

  it('puts the envelope before consent and attributes', () => {
    expect(
      reject(ClientCreateRequestSchema, {
        ...create(),
        formVersion: undefined,
      }),
    ).toEqual(expected('formVersion.required', 'formVersion'));
    expect(
      reject(ClientCreateRequestSchema, {
        ...create(),
        consentAttested: false,
        name: '',
      }),
    ).toEqual(expected('consentAttested.required', 'consentAttested'));
  });

  it('accepts an update body without consent and rejects one with it', () => {
    const body = {
      revision: 2,
      formVersion: 1,
      values: {},
      name: 'Ana',
      email: 'ana@example.com',
    };
    expect(parse(ClientUpdateRequestSchema, body)).toMatchObject({
      revision: 2,
      name: 'Ana',
    });
    expect(
      reject(ClientUpdateRequestSchema, { ...body, consentAttested: true }),
    ).toEqual(expected('consentAttested.not-allowed', 'consentAttested'));
  });
});

describe('delete request', () => {
  it('R8 takes an optional confirmName', () => {
    expect(parse(DeleteClientRequestSchema, {})).toEqual({});
    expect(parse(DeleteClientRequestSchema, { confirmName: 'Ana' })).toEqual({
      confirmName: 'Ana',
    });
  });
});

describe('list query', () => {
  it('defaults status to active and limit to 50', () => {
    expect(parse(ListClientsQuerySchema, {})).toEqual({
      q: undefined,
      status: 'active',
      sort: 'name',
      limit: 50,
      after: undefined,
    });
  });

  it('R9 trims q', () => {
    expect(parse(ListClientsQuerySchema, { q: '  ana ' }).q).toBe('ana');
  });

  it('AC-0004-52 treats a blank q as no filter', () => {
    expect(parse(ListClientsQuerySchema, { q: '   ' }).q).toBeUndefined();
    expect(parse(ListClientsQuerySchema, { q: '' }).q).toBeUndefined();
  });

  it('AC-0004-40 rejects a q of 1 character', () => {
    expect(reject(ListClientsQuerySchema, { q: 'a' })).toEqual(
      expected('clientSearch.min', 'q'),
    );
    expect(reject(ListClientsQuerySchema, { q: '  a ' })).toEqual(
      expected('clientSearch.min', 'q'),
    );
  });

  it('accepts a q of 2 characters', () => {
    expect(parse(ListClientsQuerySchema, { q: 'an' }).q).toBe('an');
  });

  it('accepts the three status values', () => {
    for (const status of ['active', 'inactive', 'all']) {
      expect(parse(ListClientsQuerySchema, { status }).status).toBe(status);
    }
  });

  it('AC-0004-72 rejects any other status', () => {
    for (const status of ['deleted', 'suspended', 'ACTIVE', '']) {
      expect(reject(ListClientsQuerySchema, { status })).toEqual(
        expected('clientStatus.invalid', 'status'),
      );
    }
  });

  it('accepts a limit from 1 to 100', () => {
    expect(parse(ListClientsQuerySchema, { limit: '1' }).limit).toBe(1);
    expect(parse(ListClientsQuerySchema, { limit: '100' }).limit).toBe(100);
  });

  it('AC-0004-22 rejects a limit outside 1-100 or not a canonical integer', () => {
    for (const limit of [
      '101',
      '0',
      '-1',
      '1.5',
      '10a',
      '',
      ' 5',
      '050',
      '1e2',
    ]) {
      expect(reject(ListClientsQuerySchema, { limit })).toEqual(
        expected('limit.invalid', 'limit'),
      );
    }
  });

  it('AC-0004-23 rejects an empty cursor and keeps a non-empty one opaque', () => {
    expect(reject(ListClientsQuerySchema, { after: '' })).toEqual(
      expected('cursor.invalid', 'after'),
    );
    expect(parse(ListClientsQuerySchema, { after: 'abc.def' }).after).toBe(
      'abc.def',
    );
  });

  it('§6 reports q, then status, then limit, then after', () => {
    const bad = { q: 'a', status: 'x', limit: '0', after: '' };
    expect(reject(ListClientsQuerySchema, bad)).toEqual(
      expected('clientSearch.min', 'q'),
    );
    expect(reject(ListClientsQuerySchema, { ...bad, q: 'ana' })).toEqual(
      expected('clientStatus.invalid', 'status'),
    );
    expect(
      reject(ListClientsQuerySchema, { ...bad, q: 'ana', status: 'all' }),
    ).toEqual(expected('limit.invalid', 'limit'));
    expect(
      reject(ListClientsQuerySchema, {
        ...bad,
        q: 'ana',
        status: 'all',
        limit: '5',
      }),
    ).toEqual(expected('cursor.invalid', 'after'));
  });
});

describe('list query, SPEC-0006', () => {
  it('AC-0006-07 rejects a malformed formId with formId.invalid', () => {
    expect(reject(ListClientsQuerySchema, { formId: 'not-an-id' })).toEqual(
      expected('formId.invalid', 'formId'),
    );
  });

  it('AC-0006-25 rejects sort "phone" with clientSort.invalid', () => {
    expect(reject(ListClientsQuerySchema, { sort: 'phone' })).toEqual(
      expected('clientSort.invalid', 'sort'),
    );
  });

  it('AC-0006-53 rejects sort "updatedAt" with clientSort.invalid', () => {
    expect(reject(ListClientsQuerySchema, { sort: 'updatedAt' })).toEqual(
      expected('clientSort.invalid', 'sort'),
    );
  });

  it('AC-0006-27 checks q before formId and sort', () => {
    expect(
      reject(ListClientsQuerySchema, {
        q: 'a',
        formId: 'not-an-id',
        sort: 'phone',
      }),
    ).toEqual(expected('clientSearch.min', 'q'));
  });

  it('AC-0006-42 checks formId before sort', () => {
    expect(
      reject(ListClientsQuerySchema, { formId: 'not-an-id', sort: 'phone' }),
    ).toEqual(expected('formId.invalid', 'formId'));
  });

  it('§6 reports status, then formId, then sort, then limit, then after', () => {
    const bad = {
      status: 'x',
      formId: 'not-an-id',
      sort: 'phone',
      limit: '0',
      after: '',
    };
    expect(reject(ListClientsQuerySchema, bad)).toEqual(
      expected('clientStatus.invalid', 'status'),
    );
    expect(reject(ListClientsQuerySchema, { ...bad, status: 'all' })).toEqual(
      expected('formId.invalid', 'formId'),
    );
    expect(
      reject(ListClientsQuerySchema, {
        ...bad,
        status: 'all',
        formId: randomUUID(),
      }),
    ).toEqual(expected('clientSort.invalid', 'sort'));
    expect(
      reject(ListClientsQuerySchema, {
        ...bad,
        status: 'all',
        formId: randomUUID(),
        sort: '-name',
      }),
    ).toEqual(expected('limit.invalid', 'limit'));
  });
});

describe('shared pagination schemas', () => {
  it('LimitQuerySchema defaults to 50', () => {
    expect(LimitQuerySchema.parse(undefined)).toBe(50);
    expect(LimitQuerySchema.parse('7')).toBe(7);
  });

  it('CursorQuerySchema is optional', () => {
    expect(CursorQuerySchema.parse(undefined)).toBeUndefined();
  });
});
