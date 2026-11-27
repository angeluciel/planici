import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Field } from '@planici/schemas';
import {
  checkRecordValues,
  missingRequired,
} from '@src/modules/records/domain/record-check.js';
import type { RecordVersion } from '@src/modules/records/domain/record-version.js';

// U-chk: step 5 of SPEC-0003 section 6 against in-memory versions: the three
// passes of Decision 3, blanks, yes_no and `missingRequired`.
//
// Names not fixed by the plan (the implementation may rename them, the
// assertions stay): `checkRecordValues(version, values)` returns the normalised
// values without blanks or throws; `missingRequired(version, stored,
// systemPresence)` returns field ids in version order; a `RecordVersion` is
// `{ number, fields }` with the fields as the version read lists them.

function fieldOf(type: Field['type'], extra: Partial<Field> = {}): Field {
  return {
    id: randomUUID(),
    label: `Campo ${type}`,
    type,
    required: false,
    sensitive: false,
    sensitiveLock: null,
    requiredLock: false,
    helpText: null,
    options: null,
    systemKey: null,
    valueCount: 0,
    ...extra,
  };
}

const versionOf = (...fields: Field[]): RecordVersion =>
  ({ number: 1, fields }) as RecordVersion;

type Thrown = { status: number; code: string; field: string | undefined };

function failure(work: () => unknown): Thrown {
  try {
    work();
  } catch (error) {
    const { status, code, field } = error as Thrown;
    return { status, code, field };
  }
  throw new Error('the check passed');
}

const check = (version: RecordVersion, values: unknown) => () =>
  checkRecordValues(version, values);

const NAME = fieldOf('full_name', {
  id: randomUUID(),
  label: 'Nome completo',
  systemKey: 'client.name',
  required: true,
});
const PHONE = fieldOf('phone', {
  id: randomUUID(),
  label: 'Telefone',
  systemKey: 'client.phone',
});

describe('required custom fields', () => {
  it('AC-0003-02 rejects a missing value for a required field with value.required', () => {
    const profession = fieldOf('text', { required: true });

    expect(failure(check(versionOf(NAME, profession), {}))).toEqual({
      status: 422,
      code: 'value.required',
      field: `values.${profession.id}`,
    });
  });

  it('AC-0003-03 rejects whitespace only for a required field with value.required', () => {
    const profession = fieldOf('text', { required: true });

    expect(
      failure(check(versionOf(NAME, profession), { [profession.id]: '   ' })),
    ).toEqual({
      status: 422,
      code: 'value.required',
      field: `values.${profession.id}`,
    });
  });

  it('AC-0003-02 rejects null for a required field with value.required', () => {
    const profession = fieldOf('text', { required: true });

    expect(
      failure(check(versionOf(profession), { [profession.id]: null })),
    ).toMatchObject({ code: 'value.required' });
  });

  it('R6 does not ask for system fields: their values are not in values', () => {
    expect(checkRecordValues(versionOf(NAME, PHONE), {})).toEqual({});
  });

  it('AC-0003-02 accepts a value for a required field and returns it', () => {
    const profession = fieldOf('text', { required: true });

    expect(
      checkRecordValues(versionOf(NAME, profession), {
        [profession.id]: 'Engenheira',
      }),
    ).toEqual({ [profession.id]: 'Engenheira' });
  });

  it('SPEC-0002 R8 does not ask for a required yes_no field', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante', required: true });

    expect(checkRecordValues(versionOf(smoker), {})).toStrictEqual({});
  });
});

describe('yes_no', () => {
  it('AC-0003-69 accepts no value for a yes_no field and reads it as false', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante' });

    const result = checkRecordValues(versionOf(NAME, smoker), {});

    expect(result[smoker.id] ?? false).toBe(false);
  });

  it('AC-0003-69 accepts null for a yes_no field', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante' });

    const result = checkRecordValues(versionOf(smoker), {
      [smoker.id]: null,
    });

    expect(result[smoker.id] ?? false).toBe(false);
  });

  it('AC-0003-69 keeps true for a yes_no field', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante' });

    expect(checkRecordValues(versionOf(smoker), { [smoker.id]: true })).toEqual(
      { [smoker.id]: true },
    );
  });

  it('Decision 6 leaves a false yes_no field out of the result', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante' });

    expect(
      checkRecordValues(versionOf(smoker), { [smoker.id]: false }),
    ).toStrictEqual({});
  });
});

describe('system field ids in values', () => {
  it('AC-0003-72 rejects a value for a system field id with 422 value.unknown-field', () => {
    expect(
      failure(check(versionOf(NAME, PHONE), { [NAME.id]: 'Ana Souza' })),
    ).toEqual({
      status: 422,
      code: 'value.unknown-field',
      field: `values.${NAME.id}`,
    });
  });

  it('AC-0003-72 rejects an id that is not in the version with 400 value.unknown-field', () => {
    const elsewhere = randomUUID();

    expect(failure(check(versionOf(NAME), { [elsewhere]: 'x' }))).toEqual({
      status: 400,
      code: 'value.unknown-field',
      field: `values.${elsewhere}`,
    });
  });
});

describe('blanks and normalisation', () => {
  it('R3 leaves blank, null and empty-address values out of the result', () => {
    const hobby = fieldOf('text', { label: 'Hobby' });
    const notes = fieldOf('long_text', { label: 'Notas' });
    const document = fieldOf('cpf', { label: 'Documento' });
    const address = fieldOf('address', { label: 'Endereço' });
    const goal = fieldOf('text', { label: 'Objetivo' });

    const result = checkRecordValues(
      versionOf(NAME, hobby, notes, document, address, goal),
      {
        [hobby.id]: '   ',
        [notes.id]: '',
        [document.id]: null,
        [address.id]: {
          cep: '',
          street: '',
          number: '',
          complement: '',
          district: '',
          city: '',
          state: '',
        },
        [goal.id]: 'Ganhar massa',
      },
    );

    expect(result).toEqual({ [goal.id]: 'Ganhar massa' });
  });

  it('§3.1 returns normalised values', () => {
    const cpf = fieldOf('cpf', { label: 'Documento' });
    const text = fieldOf('text', { label: 'Profissão' });
    const email = fieldOf('email', { label: 'E-mail 2' });

    expect(
      checkRecordValues(versionOf(cpf, text, email), {
        [cpf.id]: '529.982.247-25',
        [text.id]: '  Engenheira ',
        [email.id]: 'Ana@Example.com',
      }),
    ).toEqual({
      [cpf.id]: '52998224725',
      [text.id]: 'Engenheira',
      [email.id]: 'ana@example.com',
    });
  });

  it('AC-0003-76 stores the state of an address uppercased', () => {
    const address = fieldOf('address', { label: 'Endereço' });

    const result = checkRecordValues(versionOf(address), {
      [address.id]: {
        cep: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: '',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'sp',
      },
    });

    expect(result[address.id]).toMatchObject({
      cep: '01310100',
      complement: null,
      state: 'SP',
    });
  });
});

describe('type rules', () => {
  it('AC-0003-04 reports the type key of the first failing field at values.<fieldId>', () => {
    const cpf = fieldOf('cpf', { label: 'Documento' });

    expect(
      failure(check(versionOf(cpf), { [cpf.id]: '123.456.789-00' })),
    ).toEqual({
      status: 422,
      code: 'cpf.invalid',
      field: `values.${cpf.id}`,
    });
  });

  it('AC-0003-32 reports an address part at values.<fieldId>.<part>', () => {
    const address = fieldOf('address', { label: 'Endereço' });

    expect(
      failure(
        check(versionOf(address), {
          [address.id]: {
            cep: '01310100',
            street: 'a'.repeat(121),
            number: '1',
            complement: '',
            district: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        }),
      ),
    ).toEqual({
      status: 422,
      code: 'value.max',
      field: `values.${address.id}.street`,
    });
  });

  it('AC-0003-08 rejects an id that is not an option of the field and accepts one that is', () => {
    const shift = fieldOf('select', {
      label: 'Turno',
      options: [{ id: randomUUID(), label: 'Manhã' }],
    });

    expect(
      failure(check(versionOf(shift), { [shift.id]: randomUUID() })),
    ).toEqual({
      status: 422,
      code: 'option.invalid',
      field: `values.${shift.id}`,
    });
    expect(
      checkRecordValues(versionOf(shift), {
        [shift.id]: shift.options![0]!.id,
      }),
    ).toEqual({ [shift.id]: shift.options![0]!.id });
  });
});

// Every issue of the value schemas carries an error key, and a failed parse has
// at least one issue, so only a stubbed schema reaches the value.invalid
// fallback.
describe('an issue without an error key', () => {
  type StubIssue = { message: string; path: PropertyKey[] };

  afterEach(() => {
    vi.doUnmock('@planici/schemas');
    vi.resetModules();
  });

  async function failureWithIssues(issues: StubIssue[]) {
    vi.resetModules();
    vi.doMock('@planici/schemas', async (importOriginal) => ({
      ...(await importOriginal<Record<string, unknown>>()),
      customValueSchema: () => ({
        safeParse: () => ({ success: false, error: { issues } }),
      }),
    }));
    const stubbed = await import('@src/modules/records/domain/record-check.js');
    const text = fieldOf('text');

    return {
      id: text.id,
      thrown: failure(() =>
        stubbed.checkRecordValues(versionOf(text), { [text.id]: 'x' }),
      ),
    };
  }

  it('reports value.invalid at the path of the first issue', async () => {
    const { id, thrown } = await failureWithIssues([
      { message: 'Too big', path: ['street'] },
      { message: 'cpf.invalid', path: [] },
    ]);

    expect(thrown).toEqual({
      status: 422,
      code: 'value.invalid',
      field: `values.${id}.street`,
    });
  });

  it('reports value.invalid at values.<fieldId> when there is no issue', async () => {
    const { id, thrown } = await failureWithIssues([]);

    expect(thrown).toEqual({
      status: 422,
      code: 'value.invalid',
      field: `values.${id}`,
    });
  });
});

// Decision 3: pass 1 the keys in request order, pass 2 the required fields in
// version order, pass 3 the type rules in version order.
describe('order of the three passes (Decision 3)', () => {
  it('Decision 3 pass 1 (keys) comes before pass 2 (required)', () => {
    const required = fieldOf('text', { required: true });
    const elsewhere = randomUUID();

    expect(failure(check(versionOf(required), { [elsewhere]: 'x' }))).toEqual({
      status: 400,
      code: 'value.unknown-field',
      field: `values.${elsewhere}`,
    });
  });

  it('Decision 3 pass 1 (keys) comes before pass 3 (type rules)', () => {
    const cpf = fieldOf('cpf');

    expect(
      failure(
        check(versionOf(NAME, cpf), {
          [cpf.id]: '123.456.789-00',
          [NAME.id]: 'x',
        }),
      ),
    ).toMatchObject({ status: 422, code: 'value.unknown-field' });
  });

  it('Decision 3 pass 2 (required) comes before pass 3 (type rules), whatever the version order', () => {
    const cpf = fieldOf('cpf', { label: 'Documento' });
    const required = fieldOf('text', { label: 'Profissão', required: true });

    expect(
      failure(check(versionOf(cpf, required), { [cpf.id]: '123.456.789-00' })),
    ).toEqual({
      status: 422,
      code: 'value.required',
      field: `values.${required.id}`,
    });
  });

  it('Decision 3 pass 1 follows the request order across 400 and 422', () => {
    const elsewhere = randomUUID();
    const version = versionOf(NAME);

    expect(
      failure(check(version, { [elsewhere]: 'x', [NAME.id]: 'y' })),
    ).toMatchObject({ status: 400, field: `values.${elsewhere}` });
    expect(
      failure(check(version, { [NAME.id]: 'y', [elsewhere]: 'x' })),
    ).toMatchObject({ status: 422, field: `values.${NAME.id}` });
  });

  it('Decision 3 pass 2 follows the version order, not the request order', () => {
    const first = fieldOf('text', { label: 'Primeiro', required: true });
    const second = fieldOf('text', { label: 'Segundo', required: true });

    expect(failure(check(versionOf(first, second), {}))).toMatchObject({
      field: `values.${first.id}`,
    });
  });

  it('Decision 3 pass 3 follows the version order, not the request order', () => {
    const cpf = fieldOf('cpf', { label: 'Documento' });
    const email = fieldOf('email', { label: 'Contato' });

    expect(
      failure(
        check(versionOf(cpf, email), {
          [email.id]: 'ana@',
          [cpf.id]: '123.456.789-00',
        }),
      ),
    ).toEqual({
      status: 422,
      code: 'cpf.invalid',
      field: `values.${cpf.id}`,
    });
  });

  it('Decision 3 checks an address for completeness first, then cep, street and state in order', () => {
    const address = fieldOf('address', { label: 'Endereço' });
    const complete = {
      cep: '01310100',
      street: 'Avenida Paulista',
      number: '1000',
      complement: '',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    };
    const run = (value: object) =>
      failure(check(versionOf(address), { [address.id]: value }));

    expect(run({ ...complete, cep: '1', city: '' })).toMatchObject({
      code: 'address.incomplete',
      field: `values.${address.id}`,
    });
    expect(
      run({ ...complete, cep: '1', street: 'a'.repeat(121), state: 'XX' }),
    ).toMatchObject({ code: 'cep.invalid', field: `values.${address.id}.cep` });
    expect(
      run({ ...complete, street: 'a'.repeat(121), state: 'XX' }),
    ).toMatchObject({
      code: 'value.max',
      field: `values.${address.id}.street`,
    });
    expect(run({ ...complete, state: 'XX' })).toMatchObject({
      code: 'uf.invalid',
      field: `values.${address.id}.state`,
    });
  });
});

describe('missingRequired (R6)', () => {
  it('R6 lists a required custom field that has no value', () => {
    const profession = fieldOf('text', { label: 'Profissão', required: true });
    const hobby = fieldOf('text', { label: 'Hobby' });

    expect(missingRequired(versionOf(NAME, profession, hobby), {}, {})).toEqual(
      [profession.id],
    );
  });

  it('R6 leaves out a required custom field that has a value', () => {
    const profession = fieldOf('text', { label: 'Profissão', required: true });

    expect(
      missingRequired(
        versionOf(profession),
        { [profession.id]: 'Engenheira' },
        {},
      ),
    ).toEqual([]);
  });

  it('R6 lists a required system field whose presence is false', () => {
    const requiredPhone = { ...PHONE, required: true };

    expect(
      missingRequired(
        versionOf(NAME, requiredPhone),
        {},
        { 'client.phone': false },
      ),
    ).toEqual([requiredPhone.id]);
  });

  it('R6 leaves out a required system field that is present or not reported', () => {
    const requiredPhone = { ...PHONE, required: true };

    expect(
      missingRequired(
        versionOf(NAME, requiredPhone),
        {},
        { 'client.phone': true },
      ),
    ).toEqual([]);
    expect(missingRequired(versionOf(NAME, requiredPhone), {}, {})).toEqual([]);
  });

  it('R6 lists the missing fields in version order, system and custom together', () => {
    const requiredPhone = { ...PHONE, required: true };
    const goal = fieldOf('text', { label: 'Objetivo', required: true });
    const profession = fieldOf('text', { label: 'Profissão', required: true });

    expect(
      missingRequired(
        versionOf(NAME, requiredPhone, goal, profession),
        {},
        { 'client.phone': false },
      ),
    ).toEqual([requiredPhone.id, goal.id, profession.id]);
  });

  it('SPEC-0002 R8 never lists a yes_no field', () => {
    const smoker = fieldOf('yes_no', { label: 'Fumante', required: true });

    expect(missingRequired(versionOf(smoker), {}, {})).toEqual([]);
  });
});

describe('the values envelope', () => {
  it.each([
    ['null', null],
    ['an array', [NAME.id]],
    ['a string', 'Dentista'],
    ['a number', 42],
    ['absent', undefined],
  ])(
    'rejects %s in place of the values object with values.invalid',
    (_, values) => {
      expect(failure(check(versionOf(NAME), values))).toEqual({
        status: 422,
        code: 'values.invalid',
        field: 'values',
      });
    },
  );
});
