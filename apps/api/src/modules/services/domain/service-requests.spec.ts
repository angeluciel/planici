import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CursorQuerySchema,
  DeleteServiceRequestSchema,
  LimitQuerySchema,
  ListServicesQuerySchema,
  SERVICE_ERROR_CODES,
  SERVICE_SORTS,
  ServiceAttributesSchema,
  ServiceCreateRequestSchema,
  ServiceIdSchema,
  ServiceNameSchema,
  ServiceTemplateSummarySchema,
  ServiceSummarySchema,
  ServiceUpdateRequestSchema,
  textKey,
} from '@planici/schemas';
import type { ZodType } from 'zod';
import { ValidationError, ZodBody } from '@shared/http/zod-validation.pipe.js';

// U-sreq: the service schemas of packages/schemas through ZodBody, the pipe the
// controllers use (SPEC-0005 §6, §7 and plan, Contracts).

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

const valid = {
  name: 'Sessão individual',
  durationMinutes: 90,
  priceCents: 15000,
  currency: 'BRL',
};

describe('constants and error codes', () => {
  it('lists the service error codes of §6, each once', () => {
    expect(SERVICE_ERROR_CODES).toEqual([
      'serviceName.required',
      'serviceName.max',
      'serviceName.taken',
      'serviceDuration.required',
      'serviceDuration.invalid',
      'servicePrice.required',
      'servicePrice.negative',
      'servicePrice.invalid',
      'serviceCurrency.required',
      'serviceCurrency.invalid',
      'service.not-found',
      'service.has-history',
      'service.status-unchanged',
      'serviceSearch.min',
      'serviceStatus.invalid',
      'serviceSort.invalid',
      'limit.invalid',
      'cursor.invalid',
    ]);
    expect(new Set(SERVICE_ERROR_CODES).size).toBe(SERVICE_ERROR_CODES.length);
  });

  it('R11 lists the sorts, the default first', () => {
    expect(SERVICE_SORTS).toEqual(['name', '-name', '-updatedAt', 'form']);
  });
});

describe('service id', () => {
  it('accepts a uuid', () => {
    const id = randomUUID();
    expect(ServiceIdSchema.parse(id)).toBe(id);
  });

  it('AC-0005-45 rejects a malformed id with service.not-found', () => {
    const result = ServiceIdSchema.safeParse('abc');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('service.not-found');
  });
});

describe('name', () => {
  it('AC-0005-22 trims and collapses repeated spaces', () => {
    expect(ServiceNameSchema.parse('  Sessão   individual ')).toBe(
      'Sessão individual',
    );
    expect(
      parse(ServiceAttributesSchema, { ...valid, name: ' a \t b ' }),
    ).toMatchObject({
      name: 'a b',
    });
  });

  it('AC-0005-04 rejects a blank name', () => {
    expect(reject(ServiceAttributesSchema, { ...valid, name: '   ' })).toEqual(
      expected('serviceName.required', 'name'),
    );
    expect(reject(ServiceAttributesSchema, { ...valid, name: '' })).toEqual(
      expected('serviceName.required', 'name'),
    );
  });

  it('AC-0005-04 rejects a missing or non-string name as required', () => {
    const { name: _name, ...noName } = valid;
    expect(reject(ServiceAttributesSchema, noName)).toEqual(
      expected('serviceName.required', 'name'),
    );
    expect(reject(ServiceAttributesSchema, { ...valid, name: 7 })).toEqual(
      expected('serviceName.required', 'name'),
    );
  });

  it('AC-0005-23 accepts 80 characters and rejects 81', () => {
    expect(ServiceNameSchema.parse('a'.repeat(80))).toBe('a'.repeat(80));
    expect(
      reject(ServiceAttributesSchema, { ...valid, name: 'a'.repeat(81) }),
    ).toEqual(expected('serviceName.max', 'name'));
  });

  it('AC-0005-22 counts the length after collapsing spaces', () => {
    const name = `${'a'.repeat(40)}     ${'b'.repeat(39)}`;
    expect(ServiceNameSchema.parse(name)).toBe(
      `${'a'.repeat(40)} ${'b'.repeat(39)}`,
    );
  });

  it('AC-0005-05 the name key folds case, accents and spaces (R3)', () => {
    expect(textKey('Sessão individual')).toBe(textKey('sessao  individual'));
    expect(textKey(ServiceNameSchema.parse('SESSÃO   Individual'))).toBe(
      'sessao individual',
    );
  });
});

describe('duration', () => {
  it('AC-0005-24 rejects a missing duration as required', () => {
    const { durationMinutes: _d, ...body } = valid;
    expect(reject(ServiceAttributesSchema, body)).toEqual(
      expected('serviceDuration.required', 'durationMinutes'),
    );
  });

  it('AC-0005-07 rejects 4 minutes', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, durationMinutes: 4 }),
    ).toEqual(expected('serviceDuration.invalid', 'durationMinutes'));
  });

  it('AC-0005-08 rejects 1441 minutes', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, durationMinutes: 1441 }),
    ).toEqual(expected('serviceDuration.invalid', 'durationMinutes'));
  });

  it('AC-0005-25 rejects a fraction', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, durationMinutes: 90.5 }),
    ).toEqual(expected('serviceDuration.invalid', 'durationMinutes'));
  });

  it('AC-0005-25 rejects a non-number, null and zero', () => {
    for (const durationMinutes of ['90', null, 0, -5, true]) {
      expect(
        reject(ServiceAttributesSchema, { ...valid, durationMinutes }),
      ).toEqual(expected('serviceDuration.invalid', 'durationMinutes'));
    }
  });

  it('R4 accepts 5, 1440 and any minute value between', () => {
    for (const durationMinutes of [5, 7, 61, 1440]) {
      expect(
        parse(ServiceAttributesSchema, { ...valid, durationMinutes })
          .durationMinutes,
      ).toBe(durationMinutes);
    }
  });
});

describe('price', () => {
  it('AC-0005-26 rejects a missing price as required', () => {
    const { priceCents: _p, ...body } = valid;
    expect(reject(ServiceAttributesSchema, body)).toEqual(
      expected('servicePrice.required', 'priceCents'),
    );
  });

  it('AC-0005-09 rejects a negative price', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, priceCents: -1 }),
    ).toEqual(expected('servicePrice.negative', 'priceCents'));
  });

  it('AC-0005-10 accepts a free service', () => {
    expect(
      parse(ServiceAttributesSchema, { ...valid, priceCents: 0 }).priceCents,
    ).toBe(0);
  });

  it('AC-0005-11 rejects R$ 1.000.000,00 and accepts R$ 999.999,99', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, priceCents: 100_000_000 }),
    ).toEqual(expected('servicePrice.invalid', 'priceCents'));
    expect(
      parse(ServiceAttributesSchema, { ...valid, priceCents: 99_999_999 })
        .priceCents,
    ).toBe(99_999_999);
  });

  it('AC-0005-27 rejects a fractional number of centavos', () => {
    expect(
      reject(ServiceAttributesSchema, { ...valid, priceCents: 15000.5 }),
    ).toEqual(expected('servicePrice.invalid', 'priceCents'));
  });

  it('AC-0005-27 rejects a string, null and a boolean', () => {
    for (const priceCents of ['150.00', '15000', null, true]) {
      expect(reject(ServiceAttributesSchema, { ...valid, priceCents })).toEqual(
        expected('servicePrice.invalid', 'priceCents'),
      );
    }
  });
});

describe('currency', () => {
  it('AC-0005-66 rejects any currency but BRL', () => {
    for (const currency of ['USD', 'brl', '', null, 1]) {
      expect(reject(ServiceAttributesSchema, { ...valid, currency })).toEqual(
        expected('serviceCurrency.invalid', 'currency'),
      );
    }
  });

  it('AC-0005-67 rejects a missing currency as required', () => {
    const { currency: _c, ...body } = valid;
    expect(reject(ServiceAttributesSchema, body)).toEqual(
      expected('serviceCurrency.required', 'currency'),
    );
  });
});

describe('attributes first-issue order', () => {
  it('§6 step 1 reports name, then duration, then price, then currency', () => {
    expect(reject(ServiceAttributesSchema, {})).toEqual(
      expected('serviceName.required', 'name'),
    );
    expect(
      reject(ServiceAttributesSchema, {
        name: 'a',
        durationMinutes: 1,
        priceCents: -1,
        currency: 'USD',
      }),
    ).toEqual(expected('serviceDuration.invalid', 'durationMinutes'));
    expect(
      reject(ServiceAttributesSchema, {
        name: 'a',
        durationMinutes: 30,
        priceCents: -1,
        currency: 'USD',
      }),
    ).toEqual(expected('servicePrice.negative', 'priceCents'));
    expect(
      reject(ServiceAttributesSchema, {
        name: 'a',
        durationMinutes: 30,
        priceCents: 0,
        currency: 'USD',
      }),
    ).toEqual(expected('serviceCurrency.invalid', 'currency'));
  });
});

describe('create and update requests', () => {
  const create = () => ({
    formId: randomUUID(),
    formVersion: 1,
    values: {},
    ...valid,
    name: ' Sessão  individual ',
  });

  it('AC-0005-03 accepts a create body and normalises it', () => {
    const body = create();
    expect(parse(ServiceCreateRequestSchema, body)).toMatchObject({
      formId: body.formId,
      name: 'Sessão individual',
      durationMinutes: 90,
      priceCents: 15000,
      currency: 'BRL',
    });
  });

  it('puts the envelope before the attributes', () => {
    expect(
      reject(ServiceCreateRequestSchema, {
        ...create(),
        formVersion: undefined,
        name: '',
      }),
    ).toEqual(expected('formVersion.required', 'formVersion'));
  });

  it('AC-0005-66 and -67 reject the currency on create', () => {
    expect(
      reject(ServiceCreateRequestSchema, { ...create(), currency: 'USD' }),
    ).toEqual(expected('serviceCurrency.invalid', 'currency'));
    const { currency: _c, ...noCurrency } = create();
    expect(reject(ServiceCreateRequestSchema, noCurrency)).toEqual(
      expected('serviceCurrency.required', 'currency'),
    );
  });

  it('AC-0005-28 accepts an update body and requires the currency', () => {
    const body = { revision: 2, formVersion: 1, values: {}, ...valid };
    expect(parse(ServiceUpdateRequestSchema, body)).toMatchObject({
      revision: 2,
      name: 'Sessão individual',
      priceCents: 15000,
    });
    const { currency: _c, ...noCurrency } = body;
    expect(reject(ServiceUpdateRequestSchema, noCurrency)).toEqual(
      expected('serviceCurrency.required', 'currency'),
    );
  });
});

describe('delete request', () => {
  it('R8 takes an optional confirmName', () => {
    expect(parse(DeleteServiceRequestSchema, {})).toEqual({});
    expect(
      parse(DeleteServiceRequestSchema, { confirmName: 'Sessão' }),
    ).toEqual({ confirmName: 'Sessão' });
  });
});

describe('list query', () => {
  it('defaults status to active, sort to name and limit to 50', () => {
    expect(parse(ListServicesQuerySchema, {})).toEqual({
      q: undefined,
      status: 'active',
      sort: 'name',
      limit: 50,
      after: undefined,
    });
  });

  it('R9 trims q', () => {
    expect(parse(ListServicesQuerySchema, { q: '  ava ' }).q).toBe('ava');
  });

  it('AC-0005-41 treats a blank q as no filter', () => {
    expect(parse(ListServicesQuerySchema, { q: '   ' }).q).toBeUndefined();
    expect(parse(ListServicesQuerySchema, { q: '' }).q).toBeUndefined();
  });

  it('AC-0005-40 rejects a q of 1 character', () => {
    expect(reject(ListServicesQuerySchema, { q: 'a' })).toEqual(
      expected('serviceSearch.min', 'q'),
    );
    expect(reject(ListServicesQuerySchema, { q: '  a ' })).toEqual(
      expected('serviceSearch.min', 'q'),
    );
  });

  it('AC-0005-21 accepts a q of 2 characters', () => {
    expect(parse(ListServicesQuerySchema, { q: 'SESSAO' }).q).toBe('SESSAO');
    expect(parse(ListServicesQuerySchema, { q: 'an' }).q).toBe('an');
  });

  it('accepts the three status values', () => {
    for (const status of ['active', 'inactive', 'all']) {
      expect(parse(ListServicesQuerySchema, { status }).status).toBe(status);
    }
  });

  it('AC-0005-44 rejects any other status', () => {
    for (const status of ['deleted', 'suspended', 'archived', 'ACTIVE', '']) {
      expect(reject(ListServicesQuerySchema, { status })).toEqual(
        expected('serviceStatus.invalid', 'status'),
      );
    }
  });

  it('AC-0005-68 accepts a well-formed formId and AC-0005-82 rejects a malformed one', () => {
    const formId = randomUUID();
    expect(parse(ListServicesQuerySchema, { formId }).formId).toBe(formId);
    expect(reject(ListServicesQuerySchema, { formId: 'not-an-id' })).toEqual(
      expected('formId.invalid', 'formId'),
    );
  });

  it('AC-0005-71, -72 and -108 accept the four sorts', () => {
    for (const sort of ['name', '-name', '-updatedAt', 'form']) {
      expect(parse(ListServicesQuerySchema, { sort }).sort).toBe(sort);
    }
  });

  it('AC-0005-73 rejects any other sort', () => {
    for (const sort of ['price', 'updatedAt', 'duration', '-form', '']) {
      expect(reject(ListServicesQuerySchema, { sort })).toEqual(
        expected('serviceSort.invalid', 'sort'),
      );
    }
  });

  it('AC-0005-70 accepts a limit from 1 to 100', () => {
    expect(parse(ListServicesQuerySchema, { limit: '1' }).limit).toBe(1);
    expect(parse(ListServicesQuerySchema, { limit: '25' }).limit).toBe(25);
    expect(parse(ListServicesQuerySchema, { limit: '100' }).limit).toBe(100);
  });

  it('AC-0005-42 rejects a limit outside 1-100 or not a canonical integer', () => {
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
      expect(reject(ListServicesQuerySchema, { limit })).toEqual(
        expected('limit.invalid', 'limit'),
      );
    }
  });

  it('AC-0005-43 rejects an empty cursor and keeps a non-empty one opaque', () => {
    expect(reject(ListServicesQuerySchema, { after: '' })).toEqual(
      expected('cursor.invalid', 'after'),
    );
    expect(parse(ListServicesQuerySchema, { after: 'abc.def' }).after).toBe(
      'abc.def',
    );
  });

  it('§6 reports q, then status, then formId, then sort, then limit, then after', () => {
    const bad = {
      q: 'a',
      status: 'x',
      formId: 'not-an-id',
      sort: 'price',
      limit: '0',
      after: '',
    };
    const good = {
      q: 'ava',
      status: 'all',
      formId: randomUUID(),
      sort: 'form',
    };

    expect(reject(ListServicesQuerySchema, bad)).toEqual(
      expected('serviceSearch.min', 'q'),
    );
    expect(reject(ListServicesQuerySchema, { ...bad, q: 'ava' })).toEqual(
      expected('serviceStatus.invalid', 'status'),
    );
    expect(
      reject(ListServicesQuerySchema, { ...bad, q: 'ava', status: 'all' }),
    ).toEqual(expected('formId.invalid', 'formId'));
    expect(
      reject(ListServicesQuerySchema, {
        ...bad,
        q: 'ava',
        status: 'all',
        formId: good.formId,
      }),
    ).toEqual(expected('serviceSort.invalid', 'sort'));
    expect(reject(ListServicesQuerySchema, { ...bad, ...good })).toEqual(
      expected('limit.invalid', 'limit'),
    );
    expect(
      reject(ListServicesQuerySchema, { ...bad, ...good, limit: '5' }),
    ).toEqual(expected('cursor.invalid', 'after'));
  });

  it('shares the pagination schemas with every list', () => {
    expect(LimitQuerySchema.parse(undefined)).toBe(50);
    expect(CursorQuerySchema.parse(undefined)).toBeUndefined();
  });
});

describe('responses', () => {
  const summary = {
    id: randomUUID(),
    name: 'Sessão',
    durationMinutes: 60,
    priceCents: 0,
    currency: 'BRL',
    formId: randomUUID(),
    formName: 'Serviço',
    status: 'active',
    updatedAt: new Date().toISOString(),
    hasHistory: false,
  };

  it('AC-0005-111 a summary carries hasHistory', () => {
    expect(ServiceSummarySchema.parse(summary).hasHistory).toBe(false);
    expect(
      ServiceSummarySchema.safeParse({ ...summary, hasHistory: undefined })
        .success,
    ).toBe(false);
  });

  it('AC-0005-116 a template summary carries the template status', () => {
    const body = {
      templates: [
        { id: randomUUID(), name: 'Serviço', status: 'active', activeCount: 2 },
        {
          id: randomUUID(),
          name: 'Sessão',
          status: 'archived',
          activeCount: 1,
        },
      ],
      archivedCount: 3,
    };
    expect(ServiceTemplateSummarySchema.parse(body)).toEqual(body);
    expect(
      ServiceTemplateSummarySchema.safeParse({
        ...body,
        templates: [{ ...body.templates[0], status: 'deleted' }],
      }).success,
    ).toBe(false);
  });
});
