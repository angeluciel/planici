import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ClientSchema, type FieldInput } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  formsApi,
  signUpOwner,
  valueRowCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  captureProcessOutput,
  changeTemplate,
  countRecords,
  createTemplate,
  setRevision,
  storedBytesMatching,
  withField,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import {
  clientBody,
  clientRow,
  clientsApi,
  countClients,
  createClientVia,
  readClient,
  updateBody,
} from '../utils/clients-fixtures.js';

// E-rec: SPEC-0003's deferred criteria, client side, through /v1/clients
// (SPEC-0004 plan, Tests: "Deferred criteria this plan verifies")

let ctx: TestContext;
let ana: Session;
let bia: Session;

const asAna = () => clientsApi(ctx.app, ana);

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

const text = (label: string, extra: Partial<FieldInput> = {}): FieldInput => ({
  label,
  type: 'text',
  ...extra,
});

const SHIFT: FieldInput = {
  label: 'Turno',
  type: 'select',
  options: [{ label: 'Manhã' }, { label: 'Tarde' }, { label: 'Noite' }],
};

const ADDRESS = {
  cep: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: 'Sala 2',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

const KEEP = { mode: 'keep' } as const;
const UPDATE_ALL = { mode: 'update_all', confirmName: 'Ficha' } as const;

const ficha = (custom: FieldInput[] = [], session = ana) =>
  createTemplate(ctx, session, 'client', 'Ficha', custom);

const add =
  (...fields: FieldInput[]) =>
  (inputs: FieldInput[]) => [...inputs, ...fields];

const without = (label: string) => (inputs: FieldInput[]) =>
  inputs.filter((input) => input.label !== label);

// publishes a new version by adding one optional text field (no clients yet)
const publishVersion = (template: RecordTemplate, label: string) =>
  changeTemplate(ctx, ana, template, add(text(label)));

const create = (
  template: RecordTemplate,
  values: Record<string, unknown> = {},
  attrs: Parameters<typeof clientBody>[1] = {},
  overrides: Record<string, unknown> = {},
) => asAna().create(clientBody(template, attrs, values, overrides));

const recordIdOf = async (clientId: string) =>
  (await clientRow(ctx.pool, clientId))!.form_record_id;

const setClientRevision = async (clientId: string, revision: number) =>
  setRevision(ctx.pool, await recordIdOf(clientId), revision);

const update = (
  client: Parameters<typeof updateBody>[0],
  changes: Record<string, unknown> = {},
) => asAna().update(client.id, updateBody(client, changes));

const expectNothingStored = async (...sessions: Session[]) => {
  for (const session of sessions) {
    expect(await countClients(ctx.pool, session.tenantId)).toBe(0);
    expect(await countRecords(ctx.pool, session.tenantId)).toBe(0);
  }
};

describe('create, field-level checks', () => {
  it('AC-0003-02 rejects a missing value for a required field and stores no client', async () => {
    const template = await ficha([text('Profissão', { required: true })]);

    const response = await create(template).expect(422);

    expect(response.body).toEqual({
      error: 'value.required',
      field: `values.${template.fieldId('Profissão')}`,
    });
    await expectNothingStored(ana);
  });

  it('AC-0003-03 rejects whitespace for a required field and stores no client', async () => {
    const template = await ficha([text('Profissão', { required: true })]);
    const profession = template.fieldId('Profissão');

    const response = await create(template, { [profession]: '   ' }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'value.required',
      field: `values.${profession}`,
    });
    await expectNothingStored(ana);
  });

  it('AC-0003-04 rejects a CPF with wrong check digits', async () => {
    const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
    const cpf = template.fieldId('Documento');

    const response = await create(template, { [cpf]: '123.456.789-00' }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'cpf.invalid',
      field: `values.${cpf}`,
    });
  });

  it('AC-0003-05 stores a valid CPF as digits', async () => {
    const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
    const cpf = template.fieldId('Documento');

    const response = await create(template, { [cpf]: '529.982.247-25' }).expect(
      201,
    );

    expect(response.body.values).toEqual({ [cpf]: '52998224725' });
  });

  it('AC-0003-06 rejects the phone "(11) 8765-43210" in a phone field', async () => {
    const template = await ficha([{ label: 'Contato', type: 'phone' }]);
    const phone = template.fieldId('Contato');

    const response = await create(template, {
      [phone]: '(11) 8765-43210',
    }).expect(422);

    expect(response.body).toEqual({
      error: 'phone.invalid',
      field: `values.${phone}`,
    });
  });

  it('AC-0003-75 rejects DDD 20, which is not on the list of area codes', async () => {
    const template = await ficha([{ label: 'Contato', type: 'phone' }]);
    const phone = template.fieldId('Contato');

    const response = await create(template, {
      [phone]: '(20) 98765-4321',
    }).expect(422);

    expect(response.body).toEqual({
      error: 'phone.invalid',
      field: `values.${phone}`,
    });
  });

  it('AC-0003-07 rejects an address with only the CEP and the city', async () => {
    const template = await ficha([{ label: 'Endereço', type: 'address' }]);
    const address = template.fieldId('Endereço');

    const response = await create(template, {
      [address]: { cep: '01310100', city: 'São Paulo' },
    }).expect(422);

    expect(response.body).toEqual({
      error: 'address.incomplete',
      field: `values.${address}`,
    });
  });

  it('AC-0003-32 rejects a 121-character street at values.<id>.street', async () => {
    const template = await ficha([{ label: 'Endereço', type: 'address' }]);
    const address = template.fieldId('Endereço');

    const response = await create(template, {
      [address]: { ...ADDRESS, street: 'a'.repeat(121) },
    }).expect(422);

    expect(response.body).toEqual({
      error: 'value.max',
      field: `values.${address}.street`,
    });
  });

  it('AC-0003-35 rejects a CEP of 7 digits at values.<id>.cep', async () => {
    const template = await ficha([{ label: 'Endereço', type: 'address' }]);
    const address = template.fieldId('Endereço');

    const response = await create(template, {
      [address]: { ...ADDRESS, cep: '0131010' },
    }).expect(422);

    expect(response.body).toEqual({
      error: 'cep.invalid',
      field: `values.${address}.cep`,
    });
  });

  it('AC-0003-36 rejects the state "XX" at values.<id>.state', async () => {
    const template = await ficha([{ label: 'Endereço', type: 'address' }]);
    const address = template.fieldId('Endereço');

    const response = await create(template, {
      [address]: { ...ADDRESS, state: 'XX' },
    }).expect(422);

    expect(response.body).toEqual({
      error: 'uf.invalid',
      field: `values.${address}.state`,
    });
  });

  it('AC-0003-76 stores the state "sp" as "SP"', async () => {
    const template = await ficha([{ label: 'Endereço', type: 'address' }]);
    const address = template.fieldId('Endereço');

    const response = await create(template, {
      [address]: { ...ADDRESS, state: 'sp' },
    }).expect(201);

    expect(response.body.values[address]).toMatchObject({ state: 'SP' });
  });

  it('AC-0003-08 rejects an option id that is not one of the options', async () => {
    const template = await ficha([SHIFT]);
    const shift = template.fieldId('Turno');

    const response = await create(template, { [shift]: randomUUID() }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'option.invalid',
      field: `values.${shift}`,
    });
  });

  it('AC-0003-09 rejects the date 2025-02-30', async () => {
    const template = await ficha([{ label: 'Nascimento', type: 'date' }]);
    const date = template.fieldId('Nascimento');

    const response = await create(template, { [date]: '2025-02-30' }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'date.invalid',
      field: `values.${date}`,
    });
  });

  it('AC-0003-31 rejects 256 characters in a text field', async () => {
    const template = await ficha([text('Hobby')]);
    const hobby = template.fieldId('Hobby');

    const response = await create(template, {
      [hobby]: 'a'.repeat(256),
    }).expect(422);

    expect(response.body).toEqual({
      error: 'value.max',
      field: `values.${hobby}`,
    });
  });

  it('AC-0003-33 rejects the number 72.555', async () => {
    const template = await ficha([{ label: 'Peso', type: 'number' }]);
    const weight = template.fieldId('Peso');

    const response = await create(template, { [weight]: 72.555 }).expect(422);

    expect(response.body).toEqual({
      error: 'number.invalid',
      field: `values.${weight}`,
    });
  });

  it('AC-0003-34 rejects the e-mail "ana@" in an e-mail field', async () => {
    const template = await ficha([{ label: 'Contato', type: 'email' }]);
    const email = template.fieldId('Contato');

    const response = await create(template, { [email]: 'ana@' }).expect(422);

    expect(response.body).toEqual({
      error: 'email.invalid',
      field: `values.${email}`,
    });
  });

  it('AC-0003-37 rejects the string "sim" in a yes_no field', async () => {
    const template = await ficha([{ label: 'Fumante', type: 'yes_no' }]);
    const smoker = template.fieldId('Fumante');

    const response = await create(template, { [smoker]: 'sim' }).expect(422);

    expect(response.body).toEqual({
      error: 'value.invalid',
      field: `values.${smoker}`,
    });
  });

  it('AC-0003-69 returns false for a yes_no without a value and stores no row for it', async () => {
    const template = await ficha([{ label: 'Fumante', type: 'yes_no' }]);
    const smoker = template.fieldId('Fumante');

    const response = await create(template).expect(201);

    expect(response.body.values[smoker]).toBe(false);
    expect(
      await valueRowCount(ctx.pool, {
        recordId: await recordIdOf(response.body.id),
      }),
    ).toBe(0);
  });

  it('AC-0003-72 rejects a values key equal to a system field id', async () => {
    const template = await ficha();
    const nameId = template.systemFieldId('client.name');

    const response = await create(template, { [nameId]: 'Ana' }).expect(422);

    expect(response.body).toEqual({
      error: 'value.unknown-field',
      field: `values.${nameId}`,
    });
  });
});

describe('create, template and version', () => {
  it('AC-0003-10 rejects a value for a field the latest version no longer has', async () => {
    const first = await ficha([text('Hobby')]);
    const hobby = first.fieldId('Hobby');
    const second = await changeTemplate(ctx, ana, first, without('Hobby'));
    expect(second.version).toBe(2);

    const response = await create(second, { [hobby]: 'Corrida' }).expect(400);

    expect(response.body).toEqual({
      error: 'value.unknown-field',
      field: `values.${hobby}`,
    });
  });

  it('AC-0003-11 rejects an archived template with form.archived', async () => {
    const template = await ficha();
    await formsApi(ctx.app, ana).archive(template.id).expect(200);

    const response = await create(template).expect(409);

    expect(response.body).toEqual({ error: 'form.archived', field: 'formId' });
  });

  it('AC-0003-12 rejects a service template with formType.mismatch', async () => {
    const service = await createTemplate(ctx, ana, 'service', 'Serviço padrão');

    const response = await create(service).expect(422);

    expect(response.body).toEqual({
      error: 'formType.mismatch',
      field: 'formId',
    });
  });

  it("AC-0003-13 rejects another tenant's template with formId.invalid and stores nothing in either tenant", async () => {
    const theirs = await ficha([], bia);

    const response = await create(theirs).expect(400);

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
    await expectNothingStored(ana, bia);
  });

  it("AC-0003-38 rejects a value for another tenant's field id and stores nothing in either tenant", async () => {
    const theirs = await ficha([text('Hobby')], bia);
    const foreignField = theirs.fieldId('Hobby');
    const mine = await ficha();

    const response = await create(mine, { [foreignField]: 'Corrida' }).expect(
      400,
    );

    expect(response.body).toEqual({
      error: 'value.unknown-field',
      field: `values.${foreignField}`,
    });
    await expectNothingStored(ana, bia);
  });

  it('AC-0003-79 rejects a well-formed template id no template has with formId.invalid', async () => {
    const template = await ficha();

    const response = await create(
      template,
      {},
      {},
      { formId: randomUUID() },
    ).expect(400);

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
  });

  it('AC-0003-14 rejects formVersion 2 after version 3 was published and stores no client', async () => {
    const first = await ficha();
    const second = await publishVersion(first, 'Objetivo');
    const third = await publishVersion(second, 'Meta');
    expect(third.version).toBe(3);

    const response = await create(second).expect(409);

    expect(response.body).toEqual({
      error: 'record.form-changed',
      field: 'formVersion',
    });
    await expectNothingStored(ana);
  });

  it('AC-0003-67 reports record.form-changed, not cpf.invalid, for a stale version with a bad CPF', async () => {
    const first = await ficha([{ label: 'Documento', type: 'cpf' }]);
    const cpf = first.fieldId('Documento');
    const second = await publishVersion(first, 'Objetivo');
    await publishVersion(second, 'Meta');

    const response = await create(second, { [cpf]: '123.456.789-00' }).expect(
      409,
    );

    expect(response.body).toEqual({
      error: 'record.form-changed',
      field: 'formVersion',
    });
  });

  it('AC-0003-23 creates from version 3 and reports version 3 with latestVersion 3', async () => {
    const first = await ficha();
    const third = await publishVersion(
      await publishVersion(first, 'Objetivo'),
      'Meta',
    );
    expect(third.version).toBe(3);

    const response = await create(third).expect(201);

    expect(response.body.form).toMatchObject({ version: 3, latestVersion: 3 });
  });

  it('AC-0003-41 creates a client from version 2 and returns every field of the contract', async () => {
    const first = await ficha([text('Profissão')]);
    const second = await publishVersion(first, 'Objetivo');
    const profession = second.fieldId('Profissão');

    const response = await create(
      second,
      { [profession]: 'Engenheira' },
      { name: 'Ana Souza', email: 'ana@example.com', phone: '11987654321' },
    ).expect(201);

    expect(response.body).toMatchObject({
      form: {
        id: second.id,
        name: 'Ficha',
        version: 2,
        latestVersion: 2,
        status: 'active',
      },
      revision: 1,
      name: 'Ana Souza',
      email: 'ana@example.com',
      phone: '11987654321',
      values: { [profession]: 'Engenheira' },
      missingRequired: [],
      status: 'active',
    });
    expect(typeof response.body.id).toBe('string');
    expect(typeof response.body.createdAt).toBe('string');
    expect(typeof response.body.updatedAt).toBe('string');
    expect(ClientSchema.safeParse(response.body).success).toBe(true);
  });
});

describe('request envelope and tenant context', () => {
  it('AC-0003-54 rejects a create without formVersion', async () => {
    const template = await ficha();

    const response = await create(
      template,
      {},
      {},
      { formVersion: undefined },
    ).expect(422);

    expect(response.body).toEqual({
      error: 'formVersion.required',
      field: 'formVersion',
    });
  });

  it('AC-0003-86 rejects formVersion 0', async () => {
    const template = await ficha();

    const response = await create(template, {}, {}, { formVersion: 0 }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'formVersion.invalid',
      field: 'formVersion',
    });
  });

  it('AC-0003-55 rejects values sent as a list', async () => {
    const template = await ficha();

    const response = await create(template, {}, {}, { values: [] }).expect(422);

    expect(response.body).toEqual({ error: 'values.invalid', field: 'values' });
  });

  it('AC-0003-56 rejects the formId "abc"', async () => {
    const template = await ficha();

    const response = await create(template, {}, {}, { formId: 'abc' }).expect(
      422,
    );

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
  });

  it('AC-0003-64 rejects a create without formId', async () => {
    const template = await ficha();

    const response = await create(
      template,
      {},
      {},
      { formId: undefined },
    ).expect(422);

    expect(response.body).toEqual({
      error: 'formId.required',
      field: 'formId',
    });
  });

  it('AC-0003-87 rejects the values key "abc" with value.unknown-field', async () => {
    const template = await ficha();

    const response = await create(template, { abc: 'x' }).expect(422);

    expect(response.body).toEqual({
      error: 'value.unknown-field',
      field: 'values.abc',
    });
  });

  it('AC-0003-39 answers 404 tenant.not-found for a tenant the user does not belong to', async () => {
    const template = await ficha();

    const response = await clientsApi(ctx.app, {
      token: ana.token,
      tenantId: bia.tenantId,
    })
      .create(clientBody(template))
      .expect(404);

    expect(response.body).toEqual({ error: 'tenant.not-found' });
  });

  it('AC-0003-40 answers 401 to a create without an access token', async () => {
    const template = await ficha();

    await clientsApi(ctx.app, { tenantId: ana.tenantId })
      .create(clientBody(template))
      .expect(401);
  });

  it('AC-0003-57 answers 403 tenant.inactive to a create in a suspended tenant', async () => {
    const template = await ficha();
    await ctx.pool.query(
      "update tenants set status = 'suspended' where id = $1",
      [ana.tenantId],
    );

    const response = await create(template).expect(403);

    expect(response.body).toEqual({ error: 'tenant.inactive' });
  });

  it('AC-0003-58 answers 400 tenant.required to a create without a tenant context', async () => {
    const template = await ficha();

    const response = await clientsApi(ctx.app, { token: ana.token })
      .create(clientBody(template))
      .expect(400);

    expect(response.body).toEqual({ error: 'tenant.required' });
  });
});

describe('storage, logs and lists', () => {
  it('AC-0003-44 leaves no stored row with the value in plain text', async () => {
    const template = await ficha([text('Hobby')]);
    const created = await createClientVia(
      ctx,
      ana,
      template,
      {},
      {
        [template.fieldId('Hobby')]: 'Corrida',
      },
    );

    const stored = await storedBytesMatching(
      ctx.pool,
      await recordIdOf(created.id),
      'Corrida',
    );

    expect(stored.valueRows).toBe(1);
    expect(stored.matches).toEqual([]);
  });

  it('AC-0003-20 writes no field value to any log line through create, read, update and a failed validation', async () => {
    const template = await ficha([
      text('Diagnóstico'),
      { label: 'Contato', type: 'email' },
    ]);
    const diagnosis = template.fieldId('Diagnóstico');
    const contact = template.fieldId('Contato');
    const output = captureProcessOutput();
    let rejected: { body: unknown } | undefined;

    try {
      const created = await create(template, {
        [diagnosis]: 'Hipertensão',
      }).expect(201);
      await asAna().read(created.body.id).expect(200);
      await update(created.body, {
        values: { [diagnosis]: 'Hipertensão' },
      }).expect(200);
      rejected = await create(
        template,
        { [diagnosis]: 'Hipertensão', [contact]: 'Hipertensão' },
        { email: 'outra@example.com' },
      ).expect(422);
    } finally {
      output.restore();
    }

    expect(output.lines.filter((line) => line.includes('Hipertensão'))).toEqual(
      [],
    );
    expect(JSON.stringify(rejected?.body)).not.toContain('Hipertensão');
  });

  it('AC-0003-88 puts neither the CPF as typed nor its digits in the error response', async () => {
    const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
    const cpf = template.fieldId('Documento');

    const response = await create(template, { [cpf]: '123.456.789-00' }).expect(
      422,
    );

    expect(response.body).toEqual({
      error: 'cpf.invalid',
      field: `values.${cpf}`,
    });
    expect(response.text).not.toContain('123.456.789-00');
    expect(response.text).not.toContain('12345678900');
  });

  it('AC-0003-19 holds no custom value, protected or not, in any list summary', async () => {
    const template = await ficha([
      text('Diagnóstico', { sensitive: true }),
      text('Hobby'),
    ]);
    const diagnosis = template.fieldId('Diagnóstico');
    const created = await createClientVia(
      ctx,
      ana,
      template,
      {},
      {
        [diagnosis]: 'Hipertensão',
        [template.fieldId('Hobby')]: 'Corrida',
      },
    );
    expect(created.values[diagnosis]).toBe('Hipertensão');

    const list = await asAna().list({ status: 'all' }).expect(200);

    expect(list.body.clients).toHaveLength(1);
    for (const summary of list.body.clients) {
      expect(summary).not.toHaveProperty('values');
    }
    expect(list.text).not.toContain('Hipertensão');
    expect(list.text).not.toContain('Corrida');
  });
});

describe('update', () => {
  it('AC-0003-62 raises the revision from 1 to 2', async () => {
    const template = await ficha([text('Hobby')]);
    const created = await createClientVia(ctx, ana, template);

    const response = await update(created, { name: 'Ana Maria' }).expect(200);

    expect(response.body.revision).toBe(2);
  });

  it('AC-0003-42 clears an optional value when its key is absent from values', async () => {
    const template = await ficha([text('Hobby')]);
    const hobby = template.fieldId('Hobby');
    const created = await createClientVia(
      ctx,
      ana,
      template,
      {},
      {
        [hobby]: 'Corrida',
      },
    );

    await update(created, { values: {} }).expect(200);

    expect(
      (await readClient(ctx, ana, created.id)).values[hobby],
    ).toBeUndefined();
  });

  it('AC-0003-71 clears an optional value set to null', async () => {
    const template = await ficha([text('Hobby')]);
    const hobby = template.fieldId('Hobby');
    const created = await createClientVia(
      ctx,
      ana,
      template,
      {},
      {
        [hobby]: 'Corrida',
      },
    );

    await update(created, { values: { [hobby]: null } }).expect(200);

    expect(
      (await readClient(ctx, ana, created.id)).values[hobby],
    ).toBeUndefined();
  });

  it('AC-0003-43 updates a client whose template is now archived', async () => {
    const template = await ficha([text('Hobby')]);
    const created = await createClientVia(ctx, ana, template);
    await formsApi(ctx.app, ana).archive(template.id).expect(200);

    await update(created, { name: 'Ana Maria' }).expect(200);
  });

  it('AC-0003-59 rejects the second of two saves based on revision 3 and keeps the first', async () => {
    const created = await createClientVia(ctx, ana, await ficha());
    await setClientRevision(created.id, 3);
    const tabA = await readClient(ctx, ana, created.id);
    const tabB = await readClient(ctx, ana, created.id);
    expect(tabA.revision).toBe(3);

    const saved = await update(tabA, { name: 'Ana A' }).expect(200);
    expect(saved.body.revision).toBe(4);
    const rejected = await update(tabB, { name: 'Ana B' }).expect(409);

    expect(rejected.body).toEqual({
      error: 'record.revision-conflict',
      field: 'revision',
    });
    expect(await readClient(ctx, ana, created.id)).toMatchObject({
      name: 'Ana A',
      revision: 4,
    });
  });

  it('AC-0003-60 rejects an update without revision and keeps revision 3', async () => {
    const created = await createClientVia(ctx, ana, await ficha());
    await setClientRevision(created.id, 3);
    const current = await readClient(ctx, ana, created.id);

    const response = await update(current, {
      name: 'Outro Nome',
      revision: undefined,
    }).expect(422);

    expect(response.body).toEqual({
      error: 'recordRevision.required',
      field: 'revision',
    });
    expect(await readClient(ctx, ana, created.id)).toEqual(current);
  });

  it('AC-0003-65 rejects revision 0 and keeps revision 3', async () => {
    const created = await createClientVia(ctx, ana, await ficha());
    await setClientRevision(created.id, 3);
    const current = await readClient(ctx, ana, created.id);

    const response = await update(current, {
      name: 'Outro Nome',
      revision: 0,
    }).expect(422);

    expect(response.body).toEqual({
      error: 'recordRevision.invalid',
      field: 'revision',
    });
    expect(await readClient(ctx, ana, created.id)).toEqual(current);
  });

  it('AC-0003-66 rejects a formId on update and keeps the client on its template', async () => {
    const template = await ficha();
    const other = await createTemplate(ctx, ana, 'client', 'Anamnese');
    const created = await createClientVia(ctx, ana, template);

    const response = await update(created, { formId: other.id }).expect(422);

    expect(response.body).toEqual({
      error: 'formId.not-allowed',
      field: 'formId',
    });
    expect((await readClient(ctx, ana, created.id)).form.id).toBe(template.id);
  });

  it('AC-0003-68 reports record.revision-conflict, not cpf.invalid, for revision 3 on a client at revision 4', async () => {
    const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
    const cpf = template.fieldId('Documento');
    const created = await createClientVia(ctx, ana, template);
    await setClientRevision(created.id, 4);

    const response = await update(created, {
      revision: 3,
      values: { [cpf]: '123.456.789-00' },
    }).expect(409);

    expect(response.body).toEqual({
      error: 'record.revision-conflict',
      field: 'revision',
    });
  });

  it("AC-0003-22 answers 404 client.not-found to a read of another tenant's client", async () => {
    const theirs = await createClientVia(ctx, bia, await ficha([], bia));

    const response = await asAna().read(theirs.id).expect(404);

    expect(response.body).toEqual({ error: 'client.not-found' });
  });

  it("AC-0003-63 answers 404 client.not-found to an update of another tenant's client and leaves it unchanged", async () => {
    const theirs = await createClientVia(ctx, bia, await ficha([], bia));
    const before = await clientRow(ctx.pool, theirs.id);

    const response = await update(theirs, { name: 'Invasora' }).expect(404);

    expect(response.body).toEqual({ error: 'client.not-found' });
    expect(await clientRow(ctx.pool, theirs.id)).toEqual(before);
    expect(await readClient(ctx, bia, theirs.id)).toEqual(theirs);
  });

  it('AC-0003-30 rejects a value for a field only version 2 has on a client on version 1', async () => {
    const first = await ficha();
    const created = await createClientVia(ctx, ana, first);
    const second = await changeTemplate(
      ctx,
      ana,
      first,
      add(text('Objetivo')),
      KEEP,
    );
    const goal = second.fieldId('Objetivo');

    const response = await update(created, {
      values: { [goal]: 'Ganhar massa' },
    }).expect(400);

    expect(response.body).toEqual({
      error: 'value.unknown-field',
      field: `values.${goal}`,
    });
    expect((await readClient(ctx, ana, created.id)).revision).toBe(1);
  });

  it('AC-0003-82 keeps the revision when the client is inactivated', async () => {
    const created = await createClientVia(ctx, ana, await ficha());
    await setClientRevision(created.id, 2);

    await asAna().inactivate(created.id).expect(200);

    const current = await readClient(ctx, ana, created.id);
    expect(current.status).toBe('inactive');
    expect(current.revision).toBe(2);
  });
});

describe('after "Atualizar todos"', () => {
  it('AC-0003-24 moves the client to version 2, keeps Profissão and drops the Objetivo answer', async () => {
    const first = await ficha([text('Profissão'), text('Objetivo')]);
    const profession = first.fieldId('Profissão');
    const goal = first.fieldId('Objetivo');
    const created = await createClientVia(
      ctx,
      ana,
      first,
      {},
      {
        [profession]: 'Engenheira',
        [goal]: 'Ganhar massa',
      },
    );

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      without('Objetivo'),
      UPDATE_ALL,
    );

    expect(second.version).toBe(2);
    const current = await readClient(ctx, ana, created.id);
    expect(current.form).toMatchObject({ version: 2, latestVersion: 2 });
    expect(current.values).toEqual({ [profession]: 'Engenheira' });
    expect(
      await valueRowCount(ctx.pool, {
        recordId: await recordIdOf(created.id),
        fieldId: goal,
      }),
    ).toBe(0);
  });

  it('AC-0003-45 drops the answer of a select whose option was removed', async () => {
    const first = await ficha([SHIFT]);
    const shift = first.fieldId('Turno');
    const afternoon = first.optionId('Turno', 'Tarde');
    const created = await createClientVia(
      ctx,
      ana,
      first,
      {},
      {
        [shift]: afternoon,
      },
    );

    const second = await changeTemplate(
      ctx,
      ana,
      first,
      (inputs) =>
        inputs.map((input) =>
          input.label === 'Turno'
            ? {
                ...input,
                options: input.options?.filter((o) => o.id !== afternoon),
              }
            : input,
        ),
      UPDATE_ALL,
    );

    expect(second.version).toBe(2);
    const current = await readClient(ctx, ana, created.id);
    expect(current.form.version).toBe(2);
    expect(current.values[shift]).toBeUndefined();
  });

  it('AC-0003-81 raises the revision from 2 to 3', async () => {
    const first = await ficha();
    const created = await createClientVia(ctx, ana, first);
    await setClientRevision(created.id, 2);

    await changeTemplate(ctx, ana, first, add(text('Objetivo')), UPDATE_ALL);

    const current = await readClient(ctx, ana, created.id);
    expect(current.form.version).toBe(2);
    expect(current.revision).toBe(3);
  });

  it('AC-0003-26 rejects a save with formVersion 1 and revision 3 after the migration and changes nothing', async () => {
    const first = await ficha([text('Hobby')]);
    const hobby = first.fieldId('Hobby');
    const created = await createClientVia(
      ctx,
      ana,
      first,
      {},
      {
        [hobby]: 'Corrida',
      },
    );
    await setClientRevision(created.id, 3);
    await changeTemplate(ctx, ana, first, add(text('Objetivo')), UPDATE_ALL);
    expect((await readClient(ctx, ana, created.id)).revision).toBe(4);

    const response = await update(created, {
      revision: 3,
      values: { [hobby]: 'Natação' },
    }).expect(409);

    expect(response.body).toEqual({
      error: 'record.form-changed',
      field: 'formVersion',
    });
    const current = await readClient(ctx, ana, created.id);
    expect(current.form.version).toBe(2);
    expect(current.revision).toBe(4);
    expect(current.values).toEqual({ [hobby]: 'Corrida' });
  });

  describe('a field turned required', () => {
    const migratedWithoutProfession = async () => {
      const first = await ficha([text('Profissão')]);
      const created = await createClientVia(ctx, ana, first);
      const second = await changeTemplate(
        ctx,
        ana,
        first,
        (inputs) => withField(inputs, 'Profissão', { required: true }),
        UPDATE_ALL,
      );
      expect(second.version).toBe(2);
      return { id: created.id, profession: second.fieldId('Profissão') };
    };

    it('AC-0003-17 rejects an update that leaves the pending required field empty', async () => {
      const { id, profession } = await migratedWithoutProfession();
      const current = await readClient(ctx, ana, id);

      const response = await update(current, { phone: '11987654321' }).expect(
        422,
      );

      expect(response.body).toEqual({
        error: 'value.required',
        field: `values.${profession}`,
      });
    });

    it('AC-0003-89 lists the pending field in missingRequired before any edit', async () => {
      const { id, profession } = await migratedWithoutProfession();

      const current = await readClient(ctx, ana, id);

      expect(current.form.version).toBe(2);
      expect(current.missingRequired).toEqual([profession]);
    });
  });

  describe('Telefone made required', () => {
    const migratedWithoutPhone = async () => {
      const first = await ficha();
      const created = await createClientVia(ctx, ana, first);
      expect(created.phone).toBeNull();
      const second = await changeTemplate(
        ctx,
        ana,
        first,
        (inputs) => withField(inputs, 'Telefone', { required: true }),
        UPDATE_ALL,
      );
      expect(second.version).toBe(2);
      return { id: created.id, phoneId: second.systemFieldId('client.phone') };
    };

    it('AC-0003-73 reports version 2 and lists Telefone in missingRequired for a client with no phone', async () => {
      const { id, phoneId } = await migratedWithoutPhone();

      const current = await readClient(ctx, ana, id);

      expect(current.form.version).toBe(2);
      expect(current.missingRequired).toContain(phoneId);
    });

    it('AC-0003-74 rejects an update without a phone with phone.required', async () => {
      const { id } = await migratedWithoutPhone();
      const current = await readClient(ctx, ana, id);

      const response = await update(current, { phone: undefined }).expect(422);

      expect(response.body).toEqual({
        error: 'phone.required',
        field: 'phone',
      });
    });
  });
});
