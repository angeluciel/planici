import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_FIELDS,
  CLIENT_SYSTEM_INPUTS,
  SERVICE_SYSTEM_INPUTS,
  dbFor,
  formRow,
  formsApi,
  inputsFrom,
  recordRows,
  seedForm,
  seedRecord,
  seedRecords,
  signUpOwner,
  storedValue,
  valueRowCount,
  versionCount,
  type SeedField,
  type SeededForm,
  type Session,
} from '../utils/forms-fixtures.js';

// E-fld: field rules, defaults, locks and order through the real API
// (SPEC-0002 plan, Tests). "Index 3" is the slot after the three system fields.

let ctx: TestContext;
let ana: Session;
let bia: Session;

const db = () => dbFor(ctx.pool);
const asAna = () => formsApi(ctx.app, ana);
const asBia = () => formsApi(ctx.app, bia);

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
});

afterAll(async () => {
  await ctx?.close();
});

type ReadField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  sensitiveLock: string | null;
  requiredLock: boolean;
  helpText: string | null;
  options: { id: string; label: string }[] | null;
  systemKey: string | null;
};

async function seedFicha(
  versions: SeedField[][] = [CLIENT_SYSTEM_FIELDS],
  extra: { name?: string; session?: Session; revision?: number } = {},
) {
  return seedForm(db(), {
    tenantId: (extra.session ?? ana).tenantId,
    name: extra.name ?? 'Ficha',
    revision: extra.revision ?? 1,
    versions,
  });
}

/** Version 1 with the system fields plus the given custom fields. */
const withCustom = (...custom: SeedField[]) => [
  [...CLIENT_SYSTEM_FIELDS, ...custom],
];

async function inputsOf(form: SeededForm) {
  const read = await asAna().read(form.id).expect(200);
  return {
    inputs: inputsFrom(read.body.fields) as Record<string, unknown>[],
    fields: read.body.fields as ReadField[],
    body: read.body,
  };
}

/** Saves the template's own fields plus `extra`, the way the editor would. */
async function saveWith(
  form: SeededForm,
  extra: object[],
  body: object = {},
  session: Session = ana,
) {
  const { inputs } = await inputsOf(form);
  return formsApi(ctx.app, session).update(form.id, {
    revision: 1,
    fields: [...inputs, ...extra],
    ...body,
  });
}

/** `supertest`'s `.expect(status)` for an already awaited response. */
function expectStatus<T extends { status: number }>(
  response: T,
  status: number,
): T {
  expect(response.status).toBe(status);
  return response;
}

/** Saves an exact field list. */
const saveFields = (form: SeededForm, fields: object[], body: object = {}) =>
  asAna().update(form.id, { revision: 1, fields, ...body });

const labelsOf = (fields: { label: string }[]) => fields.map((f) => f.label);

async function versionIdOf(formId: string, number: number): Promise<string> {
  const { rows } = await ctx.pool.query(
    'select id from form_versions where form_id = $1 and number = $2',
    [formId, number],
  );
  return rows[0]?.id as string;
}

async function fieldRow(fieldId: string) {
  const { rows } = await ctx.pool.query(
    'select id, label, type, sensitive, system_key from form_fields where id = $1',
    [fieldId],
  );
  return rows[0] as
    | {
        id: string;
        label: string;
        type: string;
        sensitive: boolean;
        system_key: string | null;
      }
    | undefined;
}

describe('system fields', () => {
  it('AC-0002-01 creates a client template with the three system fields in order', async () => {
    const response = await asAna()
      .create({ type: 'client', name: 'Ficha', fields: CLIENT_SYSTEM_INPUTS })
      .expect(201);

    const fields = response.body.fields as ReadField[];
    expect(fields.map((f) => f.systemKey)).toEqual([
      'client.name',
      'client.email',
      'client.phone',
    ]);
    expect(fields[0]).toMatchObject({ required: true, requiredLock: true });
    expect(fields[1]).toMatchObject({ required: true, requiredLock: true });
    expect(fields[2]).toMatchObject({ required: false, requiredLock: false });
  });

  it('AC-0002-02 creates a service template with the three service system fields, all required and locked', async () => {
    const response = await asAna()
      .create({ type: 'service', name: 'Corte', fields: SERVICE_SYSTEM_INPUTS })
      .expect(201);

    const fields = response.body.fields as ReadField[];
    expect(fields.map((f) => f.systemKey)).toEqual([
      'service.name',
      'service.duration',
      'service.price',
    ]);
    for (const field of fields) {
      expect(field).toMatchObject({ required: true, requiredLock: true });
    }
  });

  it('AC-0002-03 rejects a save that omits client.email', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [inputs[0]!, inputs[2]!]).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'systemField.missing',
      field: 'fields',
    });
  });

  it('AC-0002-04 rejects client.email sent with type "text" as locked', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      inputs[0]!,
      { ...inputs[1]!, type: 'text' },
      inputs[2]!,
    ]).expect(400);

    expect(response.body).toEqual({
      error: 'systemField.locked',
      field: 'fields.1',
    });
  });

  it('AC-0002-05 relabels client.name and moves it last, keeping its id and systemKey', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      inputs[1]!,
      inputs[2]!,
      { ...inputs[0]!, label: 'Nome do paciente' },
    ]).expect(200);

    const last = (response.body.fields as ReadField[]).at(-1)!;
    expect(last).toMatchObject({
      id: form.fieldId('Nome completo'),
      systemKey: 'client.name',
      label: 'Nome do paciente',
    });
  });

  it('AC-0002-29 rejects client.email with required false', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      inputs[0]!,
      { ...inputs[1]!, required: false },
      inputs[2]!,
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldRequired.locked',
      field: 'fields.1.required',
    });
  });

  it('AC-0002-30 lets the owner make client.phone required, without a lock', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      inputs[0]!,
      inputs[1]!,
      { ...inputs[2]!, required: true },
    ]).expect(200);

    expect((response.body.fields as ReadField[])[2]).toMatchObject({
      systemKey: 'client.phone',
      required: true,
      requiredLock: false,
    });
  });

  it('AC-0002-45 rejects sensitive on a system field', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      inputs[0]!,
      { ...inputs[1]!, sensitive: true },
      inputs[2]!,
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldSensitive.not-allowed',
      field: 'fields.1.sensitive',
    });
  });

  it('AC-0002-46 rejects systemKey on an update', async () => {
    const form = await seedFicha();
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      { ...inputs[0]!, systemKey: 'client.name' },
      inputs[1]!,
      inputs[2]!,
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldSystemKey.not-allowed',
      field: 'fields.0.systemKey',
    });
  });

  it('AC-0002-39 rejects a create that repeats a system key at index 3', async () => {
    const response = await asAna()
      .create({
        type: 'client',
        name: 'Ficha',
        fields: [
          ...CLIENT_SYSTEM_INPUTS,
          { systemKey: 'client.email', label: 'E-mail 2', type: 'email' },
        ],
      })
      .expect(422);

    expect(response.body).toEqual({
      error: 'systemField.locked',
      field: 'fields.3',
    });
  });

  it('AC-0002-40 rejects a create with a system key that is not a client one', async () => {
    const response = await asAna()
      .create({
        type: 'client',
        name: 'Ficha',
        fields: [
          ...CLIENT_SYSTEM_INPUTS,
          { systemKey: 'client.cpf', label: 'CPF', type: 'cpf' },
        ],
      })
      .expect(422);

    expect(response.body).toEqual({
      error: 'systemField.locked',
      field: 'fields.3',
    });
  });
});

describe('protection and locks', () => {
  it('AC-0002-06 adds a long text field not required, not protected and without lock', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'Observações', type: 'long_text' }]),
      200,
    );

    expect((response.body.fields as ReadField[]).at(-1)).toMatchObject({
      label: 'Observações',
      type: 'long_text',
      required: false,
      sensitive: false,
      sensitiveLock: null,
    });
  });

  it('AC-0002-07 rejects a cpf field with sensitive false', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'CPF', type: 'cpf', sensitive: false }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldSensitive.locked',
      field: 'fields.3.sensitive',
    });
  });

  it('AC-0002-08 marks a "Diagnóstico principal" text field locked by its label', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        { label: 'Diagnóstico principal', type: 'text', sensitive: true },
      ]),
      200,
    );

    expect((response.body.fields as ReadField[]).at(-1)).toMatchObject({
      label: 'Diagnóstico principal',
      sensitive: true,
      sensitiveLock: 'label',
    });
  });

  it('AC-0002-09 rejects "PESO (kg)" with sensitive false', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        { label: 'PESO (kg)', type: 'number', sensitive: false },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldSensitive.locked',
      field: 'fields.3.sensitive',
    });
  });

  it('AC-0002-09 stores nothing when the protection rule rejects the save', async () => {
    const form = await seedFicha();

    expectStatus(
      await saveWith(form, [
        { label: 'PESO (kg)', type: 'number', sensitive: false },
      ]),
      422,
    );

    expect(await versionCount(ctx.pool, form.id)).toBe(1);
    expect(await formRow(ctx.pool, form.id)).toMatchObject({ revision: 1 });
  });

  it('AC-0002-27 releases the lock when a protected "Alergia" is relabelled and sent unprotected', async () => {
    const form = await seedFicha(withCustom({ label: 'Alergia' }));
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      {
        ...inputs[3]!,
        label: 'Preferência de horário',
        sensitive: false,
      },
    ]).expect(200);

    expect((response.body.fields as ReadField[])[3]).toMatchObject({
      label: 'Preferência de horário',
      sensitive: false,
      sensitiveLock: null,
    });
  });

  it('AC-0002-47 protects a new cpf field sent without sensitive, locked by type', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'CPF', type: 'cpf' }]),
      200,
    );

    expect((response.body.fields as ReadField[]).at(-1)).toMatchObject({
      type: 'cpf',
      sensitive: true,
      sensitiveLock: 'type',
    });
  });

  it('AC-0002-51 keeps a stored protection when the save omits sensitive', async () => {
    const form = await seedFicha(
      withCustom({ label: 'Objetivo', sensitive: true }),
    );
    const { inputs } = await inputsOf(form);
    const { sensitive: _omitted, ...objetivo } = inputs[3]!;

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      objetivo,
    ]).expect(200);

    expect((response.body.fields as ReadField[])[3]).toMatchObject({
      label: 'Objetivo',
      sensitive: true,
    });
    expect((await fieldRow(form.fieldId('Objetivo')))?.sensitive).toBe(true);
  });

  it('AC-0002-23 turns protection on for a field kept from version 1 without a new version', async () => {
    const form = await seedFicha([
      withCustom({ label: 'Hobby' })[0]!,
      [...CLIENT_SYSTEM_FIELDS, { label: 'Hobby' }, { label: 'Objetivo' }],
    ]);
    await seedRecord(db(), {
      form,
      version: 1,
      answers: { Hobby: 'Tricô' },
    });
    const { inputs } = await inputsOf(form);

    const response = await saveFields(
      form,
      inputs.map((f) => (f.label === 'Hobby' ? { ...f, sensitive: true } : f)),
    ).expect(200);

    expect(response.body.version).toBe(2);
    expect(await versionCount(ctx.pool, form.id)).toBe(2);
    expect((await fieldRow(form.fieldId('Hobby')))?.sensitive).toBe(true);
  });
});

describe('field shape and rule errors', () => {
  const sysInputs = async (form: SeededForm) => (await inputsOf(form)).inputs;

  it('AC-0002-11 rejects a label equal to another ignoring case, accents and spaces', async () => {
    const form = await seedFicha(
      withCustom({ label: 'Profissão' }, { label: 'Objetivo' }),
    );

    const response = expectStatus(
      await saveWith(form, [{ label: ' profissao ', type: 'text' }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldLabel.duplicate',
      field: 'fields.5.label',
    });
  });

  it('AC-0002-12 rejects a select with one option', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        { label: 'Turno', type: 'select', options: [{ label: 'Manhã' }] },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptions.required',
      field: 'fields.3.options',
    });
  });

  it('AC-0002-13 rejects a yes_no field with required true', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'Fuma', type: 'yes_no', required: true }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldRequired.locked',
      field: 'fields.3.required',
    });
  });

  it('AC-0002-18 rejects an existing text field sent with type "number"', async () => {
    const form = await seedFicha(withCustom({ label: 'Objetivo' }));
    const inputs = await sysInputs(form);

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      { ...inputs[3]!, type: 'number' },
    ]).expect(400);

    expect(response.body).toEqual({
      error: 'fieldType.immutable',
      field: 'fields.3.type',
    });
  });

  it('AC-0002-28 rejects a custom field of the system-only type "money"', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'Valor', type: 'money' }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldType.invalid',
      field: 'fields.3.type',
    });
  });

  it('AC-0002-33 rejects a label of 81 characters', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [{ label: 'x'.repeat(81), type: 'text' }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldLabel.max',
      field: 'fields.3.label',
    });
  });

  it('AC-0002-34 rejects help text of 201 characters', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        { label: 'Obs', type: 'text', helpText: 'x'.repeat(201) },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldHelpText.max',
      field: 'fields.3.helpText',
    });
  });

  it('AC-0002-35 rejects a select with 51 options', async () => {
    const form = await seedFicha();
    const options = Array.from({ length: 51 }, (_, i) => ({
      label: `Opção ${i + 1}`,
    }));

    const response = expectStatus(
      await saveWith(form, [{ label: 'Turno', type: 'select', options }]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptions.max',
      field: 'fields.3.options',
    });
  });

  it('AC-0002-36 rejects a blank option label', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }, { label: ' ' }],
        },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptionLabel.required',
      field: 'fields.3.options.1.label',
    });
  });

  it('AC-0002-37 rejects an option label of 81 characters', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }, { label: 'x'.repeat(81) }],
        },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptionLabel.max',
      field: 'fields.3.options.1.label',
    });
  });

  it('AC-0002-38 rejects an option label that repeats another ignoring case and accents', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        {
          label: 'Turno',
          type: 'select',
          options: [{ label: 'Manhã' }, { label: ' manha ' }],
        },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptionLabel.duplicate',
      field: 'fields.3.options.1.label',
    });
  });

  it('AC-0002-41 rejects the same field id twice', async () => {
    const form = await seedFicha(withCustom({ label: 'Profissão' }));
    const inputs = await sysInputs(form);

    const response = await saveFields(form, [
      ...inputs,
      { ...inputs[3]!, label: 'Outra' },
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldId.duplicate',
      field: 'fields.4.id',
    });
  });

  it('AC-0002-42 rejects an option id that is not one of the field options', async () => {
    const form = await seedFicha(
      withCustom({
        label: 'Turno',
        type: 'select',
        options: ['Manhã', 'Tarde'],
      }),
    );
    const inputs = await sysInputs(form);
    const turno = inputs[3]! as { options: { id: string; label: string }[] };

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      {
        ...turno,
        options: [turno.options[0]!, { id: randomUUID(), label: 'Tarde' }],
      },
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldOptionId.unknown',
      field: 'fields.3.options.1.id',
    });
  });

  it('AC-0002-43 rejects an option id used twice in one field', async () => {
    const form = await seedFicha(
      withCustom({
        label: 'Turno',
        type: 'select',
        options: ['Manhã', 'Tarde'],
      }),
    );
    const inputs = await sysInputs(form);
    const turno = inputs[3]! as { options: { id: string; label: string }[] };

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      {
        ...turno,
        options: [
          turno.options[0]!,
          { id: turno.options[0]!.id, label: 'Tarde' },
        ],
      },
    ]).expect(422);

    expect(response.body).toEqual({
      error: 'fieldOptionId.duplicate',
      field: 'fields.3.options.1.id',
    });
  });

  it('AC-0002-44 rejects options on a text field', async () => {
    const form = await seedFicha();

    const response = expectStatus(
      await saveWith(form, [
        {
          label: 'Obs',
          type: 'text',
          options: [{ label: 'A' }, { label: 'B' }],
        },
      ]),
      422,
    );

    expect(response.body).toEqual({
      error: 'fieldOptions.not-allowed',
      field: 'fields.3.options',
    });
  });

  it('AC-0002-52 keeps a required custom field required when the save omits required', async () => {
    const form = await seedFicha([
      withCustom({ label: 'Objetivo', required: true })[0]!,
      withCustom({ label: 'Objetivo', required: true })[0]!,
    ]);
    await seedRecords(db(), form, [2, 2]);
    const inputs = await sysInputs(form);
    const { required: _omitted, ...objetivo } = inputs[3]!;

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      objetivo,
    ]).expect(200);

    expect(response.body.version).toBe(2);
    expect((response.body.fields as ReadField[])[3]).toMatchObject({
      label: 'Objetivo',
      required: true,
    });
  });
});

describe('order, removal and versions', () => {
  const customLabels = (fields: ReadField[]) => labelsOf(fields.slice(3));

  it('AC-0002-14 stores the order A, D, B, C and returns it on read', async () => {
    const form = await seedFicha(
      withCustom(
        { label: 'A' },
        { label: 'B' },
        { label: 'C' },
        { label: 'D' },
      ),
    );
    const { inputs } = await inputsOf(form);
    const [a, b, c, d] = inputs.slice(3);

    await saveFields(form, [...inputs.slice(0, 3), a!, d!, b!, c!]).expect(200);

    const read = await asAna().read(form.id).expect(200);
    expect(customLabels(read.body.fields)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('AC-0002-25 publishes version 2 with the order C, A, B and keeps version 1 as A, B, C', async () => {
    const form = await seedFicha(
      withCustom({ label: 'A' }, { label: 'B' }, { label: 'C' }),
    );
    const { inputs } = await inputsOf(form);
    const [a, b, c] = inputs.slice(3);

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      c!,
      a!,
      b!,
    ]).expect(200);

    expect(response.body.version).toBe(2);
    expect(customLabels(response.body.fields)).toEqual(['C', 'A', 'B']);
    const versionOne = await asAna().version(form.id, 1).expect(200);
    expect(customLabels(versionOne.body.fields)).toEqual(['A', 'B', 'C']);
  });

  it('AC-0002-15 removes a field from the next version only', async () => {
    const form = await seedFicha(withCustom({ label: 'Profissão' }));
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, inputs.slice(0, 3)).expect(200);

    expect(response.body.version).toBe(2);
    expect(labelsOf(response.body.fields)).not.toContain('Profissão');
    const versionOne = await asAna().version(form.id, 1).expect(200);
    expect(labelsOf(versionOne.body.fields)).toContain('Profissão');
  });

  it('AC-0002-16 removes a field with "keep" and leaves 3 records on version 1 with their answers', async () => {
    const form = await seedFicha(withCustom({ label: 'Profissão' }));
    await seedRecords(db(), form, [1, 1, 1], () => ({ Profissão: 'Dentista' }));
    const { inputs } = await inputsOf(form);

    const response = await saveFields(form, inputs.slice(0, 3), {
      migration: { mode: 'keep' },
    }).expect(200);

    expect(labelsOf(response.body.fields)).not.toContain('Profissão');
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows.map((r) => r.form_version_id)).toEqual([
      form.versionId(1),
      form.versionId(1),
      form.versionId(1),
    ]);
    expect(
      await valueRowCount(ctx.pool, {
        formId: form.id,
        fieldId: form.fieldId('Profissão'),
      }),
    ).toBe(3);
  });

  it('AC-0002-19 removes an option with "keep"; the record stays on its version and keeps "Tarde"', async () => {
    const form = await seedFicha(
      withCustom({
        label: 'Turno',
        type: 'select',
        options: ['Manhã', 'Tarde', 'Noite'],
      }),
    );
    const record = await seedRecord(db(), {
      form,
      version: 1,
      answers: { Turno: 'Tarde' },
    });
    const { inputs } = await inputsOf(form);
    const turno = inputs[3]! as { options: { id: string; label: string }[] };

    const response = await saveFields(
      form,
      [
        ...inputs.slice(0, 3),
        {
          ...turno,
          options: turno.options.filter((o) => o.label !== 'Tarde'),
        },
      ],
      { migration: { mode: 'keep' } },
    ).expect(200);

    const latest = (response.body.fields as ReadField[])[3]!;
    expect(latest.options?.map((o) => o.label)).toEqual(['Manhã', 'Noite']);
    const [row] = await recordRows(ctx.pool, form.id);
    expect(row!.form_version_id).toBe(form.versionId(1));
    expect(
      await storedValue(
        ctx.pool,
        { id: record.id, tenantId: ana.tenantId },
        form.fieldId('Turno'),
      ),
    ).toBe(form.optionId('Turno', 'Tarde'));
  });

  it('AC-0002-24 renames an option without publishing a version', async () => {
    const turno: SeedField = {
      label: 'Turno',
      type: 'select',
      options: ['Manhã', 'Tarde'],
    };
    const form = await seedFicha([
      [...CLIENT_SYSTEM_FIELDS, turno],
      [...CLIENT_SYSTEM_FIELDS, turno],
    ]);
    await seedRecord(db(), { form, version: 1, answers: { Turno: 'Tarde' } });
    const { inputs } = await inputsOf(form);
    const field = inputs[3]! as { options: { id: string; label: string }[] };

    const response = await saveFields(form, [
      ...inputs.slice(0, 3),
      {
        ...field,
        options: field.options.map((o) =>
          o.label === 'Tarde' ? { ...o, label: 'Período da tarde' } : o,
        ),
      },
    ]).expect(200);

    expect(response.body.version).toBe(2);
    expect(await versionCount(ctx.pool, form.id)).toBe(2);
    const { rows } = await ctx.pool.query(
      'select label from form_field_options where id = $1',
      [form.optionId('Turno', 'Tarde')],
    );
    expect(rows[0].label).toBe('Período da tarde');
  });

  it('AC-0002-26 replaces a text "Peso" by a new number "Peso"; 2 records stay on version 1 with their answers', async () => {
    const form = await seedFicha(withCustom({ label: 'Peso' }));
    await seedRecords(db(), form, [1, 1], () => ({ Peso: '70' }));
    const { inputs } = await inputsOf(form);

    const response = await saveFields(
      form,
      [...inputs.slice(0, 3), { label: 'Peso', type: 'number' }],
      { migration: { mode: 'keep' } },
    ).expect(200);

    const peso = (response.body.fields as ReadField[])[3]!;
    expect(peso).toMatchObject({ label: 'Peso', type: 'number' });
    expect(peso.id).not.toBe(form.fieldId('Peso'));
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows.every((r) => r.form_version_id === form.versionId(1))).toBe(
      true,
    );
    expect(
      await valueRowCount(ctx.pool, {
        formId: form.id,
        fieldId: form.fieldId('Peso'),
      }),
    ).toBe(2);
    expect(await versionIdOf(form.id, 2)).toBeDefined();
  });
});

describe('tenant isolation and unknown ids', () => {
  it("AC-0002-20 rejects another tenant's field id as unknown and leaves it unchanged", async () => {
    const theirs = await seedFicha(withCustom({ label: 'Segredo' }), {
      session: bia,
      name: 'Ficha da Bia',
    });
    const ours = await seedFicha();
    const { inputs } = await inputsOf(ours);

    const response = await saveFields(ours, [
      ...inputs,
      { id: theirs.fieldId('Segredo'), label: 'Segredo', type: 'text' },
    ]).expect(400);

    expect(response.body).toEqual({
      error: 'field.unknown',
      field: 'fields.3.id',
    });
    const read = await asBia().read(theirs.id).expect(200);
    expect(read.body).toMatchObject({ revision: 1, version: 1 });
    expect(labelsOf(read.body.fields)).toContain('Segredo');
    expect(await fieldRow(theirs.fieldId('Segredo'))).toMatchObject({
      label: 'Segredo',
    });
  });

  it("AC-0002-20 does not let tenant B read or change tenant A's template through a field save", async () => {
    const ours = await seedFicha(withCustom({ label: 'Segredo' }));
    const { inputs } = await inputsOf(ours);

    await formsApi(ctx.app, bia)
      .update(ours.id, { revision: 1, fields: inputs })
      .expect(404);

    expect(await formRow(ctx.pool, ours.id)).toMatchObject({ revision: 1 });
  });

  it('AC-0002-31 rejects the id of a field removed in version 2', async () => {
    const form = await seedFicha([
      withCustom({ label: 'Profissão' })[0]!,
      CLIENT_SYSTEM_FIELDS,
    ]);

    const response = expectStatus(
      await saveWith(form, [
        { id: form.fieldId('Profissão'), label: 'Profissão', type: 'text' },
      ]),
      400,
    );

    expect(response.body).toEqual({
      error: 'field.unknown',
      field: 'fields.3.id',
    });
  });

  it('AC-0002-32 rejects the id of a field of another template in the same tenant', async () => {
    const ficha = await seedFicha();
    const anamnese = await seedFicha(withCustom({ label: 'Queixa' }), {
      name: 'Anamnese',
    });

    const response = expectStatus(
      await saveWith(ficha, [
        { id: anamnese.fieldId('Queixa'), label: 'Queixa', type: 'text' },
      ]),
      400,
    );

    expect(response.body).toEqual({
      error: 'field.unknown',
      field: 'fields.3.id',
    });
    const read = await asAna().read(anamnese.id).expect(200);
    expect(read.body).toMatchObject({ revision: 1, version: 1 });
    expect(await fieldRow(anamnese.fieldId('Queixa'))).toMatchObject({
      label: 'Queixa',
    });
  });
});
