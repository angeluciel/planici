import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  RecordCreateEnvelopeSchema,
  RecordUpdateEnvelopeSchema,
} from '@planici/schemas';
import type { ZodType } from 'zod';
import { ValidationError, ZodBody } from '@shared/http/zod-validation.pipe.js';

// U-req: the request envelopes through ZodBody, the pipe the SPEC-0004 and
// SPEC-0005 controllers use (SPEC-0003 plan, Tests). Section 6 step 1 and the
// first-issue order of Decision 12.

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

const createBody = (extra: Record<string, unknown> = {}) => ({
  formId: randomUUID(),
  formVersion: 2,
  values: {},
  ...extra,
});

const updateBody = (extra: Record<string, unknown> = {}) => ({
  formVersion: 2,
  revision: 3,
  values: {},
  ...extra,
});

const rejectCreate = (body: unknown) =>
  reject(RecordCreateEnvelopeSchema, body);
const rejectUpdate = (body: unknown) =>
  reject(RecordUpdateEnvelopeSchema, body);

const expected = (code: string, field: string): First => ({
  status: 422,
  code,
  field,
});

describe('create envelope', () => {
  it('§6 accepts a well-formed body and lets system attributes pass through', () => {
    const body = createBody({
      values: { [randomUUID()]: 'Engenheira' },
      name: 'Ana Souza',
      email: 'ana@example.com',
      consent: { accepted: true },
    });

    const parsed = new ZodBody(RecordCreateEnvelopeSchema).transform(body);

    expect(parsed).toMatchObject({
      formId: body.formId,
      formVersion: 2,
      name: 'Ana Souza',
      email: 'ana@example.com',
      consent: { accepted: true },
    });
  });

  it('AC-0003-54 rejects a create without formVersion', () => {
    const { formVersion: _omitted, ...body } = createBody();

    expect(rejectCreate(body)).toEqual(
      expected('formVersion.required', 'formVersion'),
    );
  });

  it('AC-0003-55 rejects values given as a list', () => {
    expect(rejectCreate(createBody({ values: [] }))).toEqual(
      expected('values.invalid', 'values'),
    );
  });

  it('AC-0003-55 rejects values that are missing, null or a string', () => {
    const { values: _omitted, ...withoutValues } = createBody();

    expect(rejectCreate(withoutValues)).toEqual(
      expected('values.invalid', 'values'),
    );
    expect(rejectCreate(createBody({ values: null }))).toEqual(
      expected('values.invalid', 'values'),
    );
    expect(rejectCreate(createBody({ values: 'texto' }))).toEqual(
      expected('values.invalid', 'values'),
    );
  });

  it('AC-0003-56 rejects formId "abc" as malformed', () => {
    expect(rejectCreate(createBody({ formId: 'abc' }))).toEqual(
      expected('formId.invalid', 'formId'),
    );
  });

  it('AC-0003-64 rejects a create without formId', () => {
    const { formId: _omitted, ...body } = createBody();

    expect(rejectCreate(body)).toEqual(expected('formId.required', 'formId'));
  });

  it('AC-0003-86 rejects formVersion 0', () => {
    expect(rejectCreate(createBody({ formVersion: 0 }))).toEqual(
      expected('formVersion.invalid', 'formVersion'),
    );
  });

  it('AC-0003-86 rejects a formVersion that is not a positive integer', () => {
    for (const formVersion of [-1, 1.5, '2', null, true]) {
      expect(rejectCreate(createBody({ formVersion }))).toMatchObject({
        status: 422,
        field: 'formVersion',
      });
    }
  });

  it('AC-0003-87 rejects a values key that is not a well-formed field id', () => {
    expect(rejectCreate(createBody({ values: { abc: 'x' } }))).toEqual({
      status: 422,
      code: 'value.unknown-field',
      field: 'values.abc',
    });
  });

  it('AC-0003-87 reports the first bad key in request order', () => {
    const body = createBody({
      values: { [randomUUID()]: 'ok', second: 'x', first: 'y' },
    });

    expect(rejectCreate(body).field).toBe('values.second');
  });
});

describe('update envelope', () => {
  it('§6 accepts a well-formed body and lets system attributes pass through', () => {
    const parsed = new ZodBody(RecordUpdateEnvelopeSchema).transform(
      updateBody({ phone: '11987654321' }),
    );

    expect(parsed).toMatchObject({
      formVersion: 2,
      revision: 3,
      phone: '11987654321',
    });
  });

  it('AC-0003-60 rejects an update without revision', () => {
    const { revision: _omitted, ...body } = updateBody();

    expect(rejectUpdate(body)).toEqual(
      expected('recordRevision.required', 'revision'),
    );
  });

  it('AC-0003-65 rejects revision 0', () => {
    expect(rejectUpdate(updateBody({ revision: 0 }))).toEqual(
      expected('recordRevision.invalid', 'revision'),
    );
  });

  it('AC-0003-66 rejects a formId on update', () => {
    expect(rejectUpdate(updateBody({ formId: randomUUID() }))).toEqual(
      expected('formId.not-allowed', 'formId'),
    );
  });

  it('AC-0003-54 rejects an update without formVersion', () => {
    const { formVersion: _omitted, ...body } = updateBody();

    expect(rejectUpdate(body)).toEqual(
      expected('formVersion.required', 'formVersion'),
    );
  });

  it('AC-0003-86 rejects formVersion 0 on update', () => {
    expect(rejectUpdate(updateBody({ formVersion: 0 }))).toEqual(
      expected('formVersion.invalid', 'formVersion'),
    );
  });

  it('AC-0003-55 rejects values given as a list on update', () => {
    expect(rejectUpdate(updateBody({ values: [] }))).toEqual(
      expected('values.invalid', 'values'),
    );
  });

  it('AC-0003-87 rejects a values key that is not a well-formed field id on update', () => {
    expect(rejectUpdate(updateBody({ values: { abc: 'x' } }))).toEqual({
      status: 422,
      code: 'value.unknown-field',
      field: 'values.abc',
    });
  });
});

// Decision 12: one request per adjacent pair, each breaking both rules. Keys
// are written in the reverse of the expected order, so the first issue cannot
// follow the property order of the request.
describe('first-issue order (Decision 12)', () => {
  it('AC-0003-64 create: a missing formId comes before a bad formVersion', () => {
    expect(rejectCreate({ values: [], formVersion: 0 })).toEqual(
      expected('formId.required', 'formId'),
    );
  });

  it('AC-0003-56 create: a malformed formId comes before a bad formVersion', () => {
    expect(rejectCreate({ values: [], formVersion: 0, formId: 'abc' })).toEqual(
      expected('formId.invalid', 'formId'),
    );
  });

  it('AC-0003-86 create: formVersion comes before values', () => {
    expect(
      rejectCreate({ values: [], formVersion: 0, formId: randomUUID() }),
    ).toEqual(expected('formVersion.invalid', 'formVersion'));
  });

  it('AC-0003-54 create: a missing formVersion comes before values', () => {
    expect(rejectCreate({ values: [], formId: randomUUID() })).toEqual(
      expected('formVersion.required', 'formVersion'),
    );
  });

  it('AC-0003-55 create: values being an object comes before each values key', () => {
    // a list has the key "0", which is not a field id either
    expect(
      rejectCreate({ values: ['x'], formVersion: 2, formId: randomUUID() }),
    ).toEqual(expected('values.invalid', 'values'));
  });

  it('AC-0003-87 create: the object fields come before the values keys', () => {
    expect(
      rejectCreate({
        values: { abc: 'x' },
        formVersion: 0,
        formId: randomUUID(),
      }),
    ).toEqual(expected('formVersion.invalid', 'formVersion'));
  });

  it('AC-0003-86 update: formVersion comes before revision', () => {
    expect(rejectUpdate({ values: [], revision: 0, formVersion: 0 })).toEqual(
      expected('formVersion.invalid', 'formVersion'),
    );
  });

  it('AC-0003-54 update: a missing formVersion comes before a missing revision', () => {
    expect(rejectUpdate({ values: [] })).toEqual(
      expected('formVersion.required', 'formVersion'),
    );
  });

  it('AC-0003-65 update: revision comes before values', () => {
    expect(rejectUpdate({ values: [], revision: 0, formVersion: 2 })).toEqual(
      expected('recordRevision.invalid', 'revision'),
    );
  });

  it('AC-0003-60 update: a missing revision comes before values', () => {
    expect(rejectUpdate({ values: [], formVersion: 2 })).toEqual(
      expected('recordRevision.required', 'revision'),
    );
  });

  it('AC-0003-55 update: values being an object comes before formId on update', () => {
    expect(
      rejectUpdate({ formId: 'abc', values: [], revision: 3, formVersion: 2 }),
    ).toEqual(expected('values.invalid', 'values'));
  });

  it('AC-0003-66 update: formId on update comes before each values key', () => {
    expect(
      rejectUpdate({
        values: { abc: 'x' },
        formId: 'abc',
        revision: 3,
        formVersion: 2,
      }),
    ).toEqual(expected('formId.not-allowed', 'formId'));
  });

  it('AC-0003-87 update: the object fields come before the values keys', () => {
    expect(
      rejectUpdate({ values: { abc: 'x' }, revision: 0, formVersion: 2 }),
    ).toEqual(expected('recordRevision.invalid', 'revision'));
  });
});
