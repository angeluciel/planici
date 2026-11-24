import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RecordBaseSchema, type FieldInput } from '@planici/schemas';
import { RecordNotFoundError } from '@src/modules/records/domain/errors/record.errors.js';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  formsApi,
  recordRows,
  signUpOwner,
  storedValue,
  valueRowCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  RECORD_TYPES,
  captureProcessOutput,
  changeTemplate,
  countRecords,
  createRecord,
  createTemplate,
  expectRecordError,
  inTenant,
  presenceFor,
  readRecord,
  recordRowOf,
  recordService,
  renderWithFilter,
  setRevision,
  storedBytesMatching,
  updateRecord,
  type RecordTemplate,
} from '../utils/records-fixtures.js';

// I-rec: RecordService resolved from createTestApp() on the Testcontainers
// database, inside TenantScope.run, with templates created through SPEC-0001's
// POST /v1/forms (SPEC-0003 plan, Tests). The HTTP response of the record
// endpoints is SPEC-0004's and SPEC-0005's to check (Deferred checks).

let ctx: TestContext;
let ana: Session;
let bia: Session;

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

const ADDRESS = {
  cep: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: 'Sala 2',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

// publishes a new version by adding one optional text field (no records yet)
const publishVersion = (template: RecordTemplate, label: string) =>
  changeTemplate(ctx, ana, template, (inputs) => [...inputs, text(label)]);

describe.each(RECORD_TYPES)(
  'RecordService create and read (%s template)',
  (type) => {
    const ficha = (custom: FieldInput[] = []) =>
      createTemplate(ctx, ana, type, 'Ficha', custom);

    const create = (
      template: RecordTemplate,
      values: Record<string, unknown>,
      formVersion?: number,
    ) => createRecord(ctx, ana.tenantId, template, { values, formVersion });

    const read = (id: string, phone = true) =>
      readRecord(ctx, ana.tenantId, id, presenceFor(type, phone));

    const expectNothingStored = async (template: RecordTemplate) => {
      expect(await recordRows(ctx.pool, template.id)).toHaveLength(0);
      expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
    };

    describe('field-level checks', () => {
      it('AC-0003-02 rejects a missing value for a required field and stores no record', async () => {
        const template = await ficha([text('Profissão', { required: true })]);

        await expectRecordError(create(template, {}), {
          status: 422,
          code: 'value.required',
          field: `values.${template.fieldId('Profissão')}`,
        });

        await expectNothingStored(template);
      });

      it('AC-0003-03 rejects whitespace for a required field and stores no record', async () => {
        const template = await ficha([text('Profissão', { required: true })]);
        const profession = template.fieldId('Profissão');

        await expectRecordError(create(template, { [profession]: '   ' }), {
          status: 422,
          code: 'value.required',
          field: `values.${profession}`,
        });

        await expectNothingStored(template);
      });

      it('AC-0003-04 rejects a CPF with wrong check digits', async () => {
        const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
        const cpf = template.fieldId('Documento');

        await expectRecordError(create(template, { [cpf]: '123.456.789-00' }), {
          status: 422,
          code: 'cpf.invalid',
          field: `values.${cpf}`,
        });
      });

      it('AC-0003-05 stores a valid CPF as digits and reads it back', async () => {
        const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
        const cpf = template.fieldId('Documento');

        const id = await create(template, { [cpf]: '529.982.247-25' });

        expect((await read(id)).values).toEqual({ [cpf]: '52998224725' });
        expect(
          await storedValue(ctx.pool, { id, tenantId: ana.tenantId }, cpf),
        ).toBe('52998224725');
      });

      it('AC-0003-06 rejects a phone with 11 digits not starting with 9 after the DDD', async () => {
        const template = await ficha([{ label: 'Contato', type: 'phone' }]);
        const phone = template.fieldId('Contato');

        await expectRecordError(
          create(template, { [phone]: '(11) 8765-43210' }),
          {
            status: 422,
            code: 'phone.invalid',
            field: `values.${phone}`,
          },
        );
      });

      it('AC-0003-07 rejects an address with only the CEP and the city', async () => {
        const template = await ficha([{ label: 'Endereço', type: 'address' }]);
        const address = template.fieldId('Endereço');

        await expectRecordError(
          create(template, {
            [address]: { cep: '01310100', city: 'São Paulo' },
          }),
          {
            status: 422,
            code: 'address.incomplete',
            field: `values.${address}`,
          },
        );
      });

      it('AC-0003-08 rejects an option id that is not one of the options', async () => {
        const template = await ficha([
          {
            label: 'Turno',
            type: 'select',
            options: [{ label: 'Manhã' }, { label: 'Tarde' }],
          },
        ]);
        const shift = template.fieldId('Turno');

        await expectRecordError(create(template, { [shift]: randomUUID() }), {
          status: 422,
          code: 'option.invalid',
          field: `values.${shift}`,
        });
      });

      it('AC-0003-09 rejects 2025-02-30 for a date field', async () => {
        const template = await ficha([{ label: 'Retorno', type: 'date' }]);
        const date = template.fieldId('Retorno');

        await expectRecordError(create(template, { [date]: '2025-02-30' }), {
          status: 422,
          code: 'date.invalid',
          field: `values.${date}`,
        });
      });

      it('AC-0003-31 rejects 256 characters for a text field', async () => {
        const template = await ficha([text('Resumo')]);
        const summary = template.fieldId('Resumo');

        await expectRecordError(
          create(template, { [summary]: 'a'.repeat(256) }),
          {
            status: 422,
            code: 'value.max',
            field: `values.${summary}`,
          },
        );
      });

      it('AC-0003-32 rejects a 121-character street at values.<fieldId>.street', async () => {
        const template = await ficha([{ label: 'Endereço', type: 'address' }]);
        const address = template.fieldId('Endereço');

        await expectRecordError(
          create(template, {
            [address]: { ...ADDRESS, street: 'a'.repeat(121) },
          }),
          { status: 422, code: 'value.max', field: `values.${address}.street` },
        );
      });

      it('AC-0003-33 rejects 72.555 for a number field', async () => {
        const template = await ficha([{ label: 'Peso', type: 'number' }]);
        const weight = template.fieldId('Peso');

        await expectRecordError(create(template, { [weight]: 72.555 }), {
          status: 422,
          code: 'number.invalid',
          field: `values.${weight}`,
        });
      });

      it('AC-0003-34 rejects "ana@" for an email custom field', async () => {
        const template = await ficha([{ label: 'Contato', type: 'email' }]);
        const email = template.fieldId('Contato');

        await expectRecordError(create(template, { [email]: 'ana@' }), {
          status: 422,
          code: 'email.invalid',
          field: `values.${email}`,
        });
      });

      it('AC-0003-35 rejects a 7-digit CEP at values.<fieldId>.cep', async () => {
        const template = await ficha([{ label: 'Endereço', type: 'address' }]);
        const address = template.fieldId('Endereço');

        await expectRecordError(
          create(template, { [address]: { ...ADDRESS, cep: '0131010' } }),
          { status: 422, code: 'cep.invalid', field: `values.${address}.cep` },
        );
      });

      it('AC-0003-36 rejects the state XX at values.<fieldId>.state', async () => {
        const template = await ficha([{ label: 'Endereço', type: 'address' }]);
        const address = template.fieldId('Endereço');

        await expectRecordError(
          create(template, { [address]: { ...ADDRESS, state: 'XX' } }),
          { status: 422, code: 'uf.invalid', field: `values.${address}.state` },
        );
      });

      it('AC-0003-37 rejects the string "sim" for a yes_no field', async () => {
        const template = await ficha([{ label: 'Fumante', type: 'yes_no' }]);
        const smoker = template.fieldId('Fumante');

        await expectRecordError(create(template, { [smoker]: 'sim' }), {
          status: 422,
          code: 'value.invalid',
          field: `values.${smoker}`,
        });
      });

      it('AC-0003-75 rejects DDD 20 for a phone field', async () => {
        const template = await ficha([{ label: 'Contato', type: 'phone' }]);
        const phone = template.fieldId('Contato');

        await expectRecordError(
          create(template, { [phone]: '(20) 98765-4321' }),
          {
            status: 422,
            code: 'phone.invalid',
            field: `values.${phone}`,
          },
        );
      });

      it('AC-0003-76 reads a lowercase state back uppercased', async () => {
        const template = await ficha([{ label: 'Endereço', type: 'address' }]);
        const address = template.fieldId('Endereço');

        const id = await create(template, {
          [address]: { ...ADDRESS, state: 'sp' },
        });

        expect((await read(id)).values[address]).toMatchObject({ state: 'SP' });
      });

      it('AC-0003-72 rejects a value for a system field id with 422 value.unknown-field', async () => {
        const template = await ficha();
        const nameId = template.systemFieldId(
          type === 'client' ? 'client.name' : 'service.name',
        );

        await expectRecordError(create(template, { [nameId]: 'Ana Souza' }), {
          status: 422,
          code: 'value.unknown-field',
          field: `values.${nameId}`,
        });
        await expectNothingStored(template);
      });

      it('AC-0003-10 rejects a value for a field the latest version no longer has', async () => {
        const first = await ficha([text('Hobby')]);
        const hobby = first.fieldId('Hobby');
        const latest = await changeTemplate(ctx, ana, first, (inputs) =>
          inputs.filter((input) => input.label !== 'Hobby'),
        );
        expect(latest.version).toBe(2);

        await expectRecordError(create(latest, { [hobby]: 'Corrida' }, 2), {
          status: 400,
          code: 'value.unknown-field',
          field: `values.${hobby}`,
        });
        await expectNothingStored(latest);
      });

      it("AC-0003-38 rejects another tenant's field id as unknown with 400 and stores nothing", async () => {
        const mine = await ficha();
        const theirs = await createTemplate(ctx, bia, type, 'Ficha', [
          text('Hobby'),
        ]);
        const foreign = theirs.fieldId('Hobby');

        await expectRecordError(create(mine, { [foreign]: 'Corrida' }), {
          status: 400,
          code: 'value.unknown-field',
          field: `values.${foreign}`,
        });

        expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
        expect(await countRecords(ctx.pool, bia.tenantId)).toBe(0);
      });
    });

    describe('template checks', () => {
      it('AC-0003-11 rejects an archived template with 409 form.archived', async () => {
        const template = await createTemplate(ctx, ana, type, 'Antigo');
        await formsApi(ctx.app, ana).archive(template.id).expect(200);

        await expectRecordError(create(template, {}), {
          status: 409,
          code: 'form.archived',
          field: 'formId',
        });
        await expectNothingStored(template);
      });

      it('AC-0003-13 treats the template of another tenant as unknown and stores nothing', async () => {
        const theirs = await createTemplate(ctx, bia, type, 'Ficha');

        await expectRecordError(
          createRecord(ctx, ana.tenantId, theirs, { values: {} }),
          { status: 400, code: 'formId.invalid', field: 'formId' },
        );

        expect(await recordRows(ctx.pool, theirs.id)).toHaveLength(0);
        expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
        expect(await countRecords(ctx.pool, bia.tenantId)).toBe(0);
      });

      it('AC-0003-79 rejects a well-formed template id that no template has', async () => {
        const template = await ficha();

        await expectRecordError(
          createRecord(ctx, ana.tenantId, template, {
            values: {},
            formId: randomUUID(),
          }),
          { status: 400, code: 'formId.invalid', field: 'formId' },
        );
      });

      it('AC-0003-14 rejects formVersion 2 after version 3 was published', async () => {
        const first = await ficha();
        const second = await publishVersion(first, 'Objetivo');
        const third = await publishVersion(second, 'Meta');
        expect([second.version, third.version]).toEqual([2, 3]);

        await expectRecordError(create(third, {}, 2), {
          status: 409,
          code: 'record.form-changed',
          field: 'formVersion',
        });
        await expectNothingStored(third);
      });

      it('AC-0003-67 reports record.form-changed, not cpf.invalid, for an outdated version', async () => {
        const first = await ficha([{ label: 'Documento', type: 'cpf' }]);
        const cpf = first.fieldId('Documento');
        const second = await publishVersion(first, 'Objetivo');
        const third = await publishVersion(second, 'Meta');

        await expectRecordError(create(third, { [cpf]: '123.456.789-00' }, 2), {
          status: 409,
          code: 'record.form-changed',
          field: 'formVersion',
        });
      });

      it('AC-0003-23 links a new record to version 3 of a template at version 3', async () => {
        const first = await ficha();
        const second = await publishVersion(first, 'Objetivo');
        const third = await publishVersion(second, 'Meta');

        const id = await create(third, {}, 3);

        expect((await read(id)).form).toMatchObject({
          version: 3,
          latestVersion: 3,
        });
      });
    });

    describe('the stored record', () => {
      it('AC-0003-41 reads back the contract shape after a create on version 2', async () => {
        const first = await ficha([text('Profissão')]);
        const template = await publishVersion(first, 'Objetivo');
        const profession = template.fieldId('Profissão');

        const id = await create(template, { [profession]: 'Engenheira' }, 2);
        const record = await read(id);

        expect(RecordBaseSchema.safeParse(record).success).toBe(true);
        expect(record.form).toEqual({
          id: template.id,
          name: 'Ficha',
          version: 2,
          latestVersion: 2,
          status: 'active',
        });
        expect(record.revision).toBe(1);
        expect(record.values).toEqual({ [profession]: 'Engenheira' });
        expect(record.missingRequired).toEqual([]);
        expect(record.createdAt).toBeTruthy();
        expect(record.updatedAt).toBeTruthy();
      });

      it('AC-0003-44 leaves no stored row with the value in plain text', async () => {
        const template = await ficha([text('Hobby')]);
        const id = await create(template, {
          [template.fieldId('Hobby')]: 'Corrida',
        });

        const stored = await storedBytesMatching(ctx.pool, id, 'Corrida');

        expect(stored.valueRows).toBe(1);
        expect(stored.matches).toEqual([]);
      });

      it('AC-0003-69 reads a yes_no without a value as false and stores no row for it', async () => {
        const template = await ficha([{ label: 'Fumante', type: 'yes_no' }]);
        const smoker = template.fieldId('Fumante');

        const id = await create(template, {});

        expect((await read(id)).values[smoker]).toBe(false);
        expect(await valueRowCount(ctx.pool, { recordId: id })).toBe(0);
      });

      it('Decision 6 stores a yes_no only when true, and reads an explicit false as false', async () => {
        const template = await ficha([
          { label: 'Fumante', type: 'yes_no' },
          { label: 'Atleta', type: 'yes_no' },
        ]);
        const smoker = template.fieldId('Fumante');
        const athlete = template.fieldId('Atleta');

        const id = await create(template, { [smoker]: true, [athlete]: false });

        expect((await read(id)).values).toEqual({
          [smoker]: true,
          [athlete]: false,
        });
        expect(await valueRowCount(ctx.pool, { recordId: id })).toBe(1);
        expect(
          await storedValue(ctx.pool, { id, tenantId: ana.tenantId }, smoker),
        ).toBe(true);
      });

      it('R3 stores no row for a blank optional value', async () => {
        const template = await ficha([text('Hobby'), text('Objetivo')]);

        const id = await create(template, {
          [template.fieldId('Hobby')]: '   ',
          [template.fieldId('Objetivo')]: null,
        });

        expect((await read(id)).values).toEqual({});
        expect(await valueRowCount(ctx.pool, { recordId: id })).toBe(0);
      });

      it("AC-0003-22 reads another tenant's record as null", async () => {
        const theirs = await createTemplate(ctx, bia, type, 'Ficha', [
          text('Hobby'),
        ]);
        const id = await createRecord(ctx, bia.tenantId, theirs, {
          values: { [theirs.fieldId('Hobby')]: 'Corrida' },
        });

        expect(
          await readRecord(ctx, ana.tenantId, id, presenceFor(type)),
        ).toBeNull();
        expect(
          await readRecord(ctx, bia.tenantId, id, presenceFor(type)),
        ).not.toBeNull();
      });

      it("Persistence reads a record with the caller's transaction before it is committed", async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');

        const seen = await inTenant(ctx, ana.tenantId, async (tx) => {
          const draft = await recordService(ctx).openForCreate(
            tx,
            ana.tenantId,
            type,
            { formId: template.id, formVersion: template.version },
          );
          const id = await draft.insert(
            await draft.checkValues({ [hobby]: 'Corrida' }),
          );
          return recordService(ctx).read(
            ana.tenantId,
            id,
            presenceFor(type),
            tx,
          );
        });

        expect(seen?.values).toEqual({ [hobby]: 'Corrida' });
      });
    });

    describe('logs and errors', () => {
      it('AC-0003-20 writes no field value to any log line through create, read, update and a failed validation', async () => {
        const template = await ficha([
          text('Diagnóstico'),
          { label: 'Contato', type: 'email' },
        ]);
        const diagnosis = template.fieldId('Diagnóstico');
        const contact = template.fieldId('Contato');
        const output = captureProcessOutput();
        let failure: Error | undefined;

        try {
          const id = await create(template, { [diagnosis]: 'Hipertensão' });
          await read(id);
          await updateRecord(ctx, ana.tenantId, id, type, {
            values: { [diagnosis]: 'Hipertensão' },
            formVersion: 1,
            revision: 1,
          });
          failure = await expectRecordError(
            create(template, {
              [diagnosis]: 'Hipertensão',
              [contact]: 'Hipertensão',
            }),
            { status: 422, code: 'email.invalid', field: `values.${contact}` },
          );
        } finally {
          output.restore();
        }

        expect(
          output.lines.filter((line) => line.includes('Hipertensão')),
        ).toEqual([]);
        expect(failure?.message).not.toContain('Hipertensão');
      });

      it('AC-0003-88 carries neither the CPF as typed nor its digits in the rendered error', async () => {
        const template = await ficha([{ label: 'Documento', type: 'cpf' }]);
        const cpf = template.fieldId('Documento');

        const error = await expectRecordError(
          create(template, { [cpf]: '123.456.789-00' }),
          { status: 422, code: 'cpf.invalid', field: `values.${cpf}` },
        );
        const rendered = renderWithFilter(error);

        expect(rendered.status).toBe(422);
        expect(rendered.body).toEqual({
          error: 'cpf.invalid',
          field: `values.${cpf}`,
        });
        const text = JSON.stringify(rendered.body) + error.message;
        expect(text).not.toContain('123.456.789-00');
        expect(text).not.toContain('12345678900');
      });
    });

    describe('update', () => {
      // a record at `revision` with a value for Hobby
      const recordWithHobby = async (
        template: RecordTemplate,
        revision = 1,
        hobby = 'Corrida',
      ) => {
        const id = await create(template, {
          [template.fieldId('Hobby')]: hobby,
        });
        if (revision !== 1) await setRevision(ctx.pool, id, revision);
        return id;
      };

      const update = (
        id: string,
        template: RecordTemplate,
        values: Record<string, unknown>,
        revision: number,
        formVersion = template.version,
      ) =>
        updateRecord(ctx, ana.tenantId, id, type, {
          values,
          revision,
          formVersion,
        });

      it('AC-0003-62 raises the revision from 1 to 2 and sets updated_at', async () => {
        const template = await ficha([text('Hobby')]);
        const id = await recordWithHobby(template);
        const before = await recordRowOf(ctx.pool, id);

        await update(
          id,
          template,
          { [template.fieldId('Hobby')]: 'Natação' },
          1,
        );

        const record = await read(id);
        expect(record.revision).toBe(2);
        expect(record.values).toEqual({
          [template.fieldId('Hobby')]: 'Natação',
        });
        const after = await recordRowOf(ctx.pool, id);
        expect(after!.updated_at.getTime()).toBeGreaterThan(
          before!.updated_at.getTime(),
        );
      });

      it('Decision 4 raises the revision even when the values are unchanged', async () => {
        const template = await ficha([text('Hobby')]);
        const id = await recordWithHobby(template);

        await update(
          id,
          template,
          { [template.fieldId('Hobby')]: 'Corrida' },
          1,
        );

        expect((await read(id)).revision).toBe(2);
      });

      it('AC-0003-42 removes the value row of a field whose key is absent from values', async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');
        const id = await recordWithHobby(template);

        await update(id, template, {}, 1);

        expect((await read(id)).values).toEqual({});
        expect(
          await valueRowCount(ctx.pool, { recordId: id, fieldId: hobby }),
        ).toBe(0);
      });

      it('AC-0003-71 clears the value when values.<fieldId> is null', async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');
        const id = await recordWithHobby(template);

        await update(id, template, { [hobby]: null }, 1);

        expect((await read(id)).values).toEqual({});
        expect(
          await valueRowCount(ctx.pool, { recordId: id, fieldId: hobby }),
        ).toBe(0);
      });

      it('AC-0003-43 accepts an update of a record whose template is archived', async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');
        const id = await recordWithHobby(template);
        await formsApi(ctx.app, ana).archive(template.id).expect(200);

        await update(id, template, { [hobby]: 'Natação' }, 1);

        const record = await read(id);
        expect(record.revision).toBe(2);
        expect(record.values).toEqual({ [hobby]: 'Natação' });
        expect(record.form.status).toBe('archived');
      });

      it('AC-0003-59 rejects the second tab with revision 3 and keeps the first save', async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');
        const id = await recordWithHobby(template, 3);

        await update(id, template, { [hobby]: 'Aba A' }, 3);
        expect((await read(id)).revision).toBe(4);

        await expectRecordError(update(id, template, { [hobby]: 'Aba B' }, 3), {
          status: 409,
          code: 'record.revision-conflict',
          field: 'revision',
        });

        const record = await read(id);
        expect(record.revision).toBe(4);
        expect(record.values).toEqual({ [hobby]: 'Aba A' });
      });

      it('AC-0003-59 lets exactly one of two updates in flight with revision 3 win', async () => {
        const template = await ficha([text('Hobby')]);
        const hobby = template.fieldId('Hobby');
        const id = await recordWithHobby(template, 3);

        const results = await Promise.allSettled([
          update(id, template, { [hobby]: 'Aba A' }, 3),
          update(id, template, { [hobby]: 'Aba B' }, 3),
        ]);

        const fulfilled = results.flatMap((result, index) =>
          result.status === 'fulfilled' ? [index] : [],
        );
        const rejected = results.flatMap((result) =>
          result.status === 'rejected' ? [result.reason as Error] : [],
        );
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0]).toMatchObject({
          status: 409,
          code: 'record.revision-conflict',
          field: 'revision',
        });
        const record = await read(id);
        expect(record.revision).toBe(4);
        expect(record.values).toEqual({
          [hobby]: fulfilled[0] === 0 ? 'Aba A' : 'Aba B',
        });
      });

      it('AC-0003-68 reports revision-conflict, not cpf.invalid, for an outdated revision', async () => {
        const template = await ficha([
          text('Hobby'),
          { label: 'Documento', type: 'cpf' },
        ]);
        const id = await recordWithHobby(template, 4);

        await expectRecordError(
          update(
            id,
            template,
            { [template.fieldId('Documento')]: '123.456.789-00' },
            3,
          ),
          { status: 409, code: 'record.revision-conflict', field: 'revision' },
        );
        expect((await read(id)).revision).toBe(4);
      });

      it('AC-0003-63 finds no record of another tenant and leaves it unchanged', async () => {
        const theirs = await createTemplate(ctx, bia, type, 'Ficha', [
          text('Hobby'),
        ]);
        const hobby = theirs.fieldId('Hobby');
        const id = await createRecord(ctx, bia.tenantId, theirs, {
          values: { [hobby]: 'Corrida' },
        });

        await expect(
          updateRecord(ctx, ana.tenantId, id, type, {
            values: { [hobby]: 'Invadido' },
            formVersion: 1,
            revision: 1,
          }),
        ).rejects.toBeInstanceOf(RecordNotFoundError);

        const record = await readRecord(
          ctx,
          bia.tenantId,
          id,
          presenceFor(type),
        );
        expect(record?.revision).toBe(1);
        expect(record?.values).toEqual({ [hobby]: 'Corrida' });
      });
    });

    // R7 race. A second pool client holds the template row `for update`, as
    // SPEC-0001's update does, and sets latest_version to 3. The app's pool has 2
    // connections: the holder takes one and the create's TenantScope.run the
    // other, so a create that borrowed a third would starve.
    it('R7 a create waiting for a template update gets record.form-changed after the commit', async () => {
      const first = await ficha();
      const template = await publishVersion(first, 'Objetivo');
      expect(template.version).toBe(2);

      const holder = await ctx.pool.connect();
      try {
        await holder.query('begin');
        await holder.query('select id from forms where id = $1 for update', [
          template.id,
        ]);

        let settled = false;
        const outcome = create(template, {}, 2).then(
          () => ({ error: undefined as unknown }),
          (error: unknown) => ({ error }),
        );
        void outcome.finally(() => {
          settled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(settled).toBe(false);

        const published = await holder.query(
          `insert into form_versions (tenant_id, form_id, number)
         values ($1, $2, 3) returning id`,
          [ana.tenantId, template.id],
        );
        await holder.query(
          `insert into form_version_fields (version_id, field_id, tenant_id, position, required)
         select $1, field_id, tenant_id, position, required
           from form_version_fields
          where version_id = (select id from form_versions where form_id = $2 and number = 2)`,
          [published.rows[0].id, template.id],
        );
        await holder.query(
          'update forms set latest_version = 3 where id = $1',
          [template.id],
        );
        await holder.query('commit');

        // the holder's connection stays checked out while the create finishes
        const result = await Promise.race([
          outcome,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error('the create did not finish: pool starved?')),
              8_000,
            ),
          ),
        ]);

        expect(result.error).toMatchObject({
          status: 409,
          code: 'record.form-changed',
          field: 'formVersion',
        });
        expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
      } finally {
        await holder.query('rollback').catch(() => undefined);
        holder.release();
      }
    }, 12_000);
  },
);

describe('A service template against a client record and the reverse', () => {
  it('AC-0003-12 rejects a service template for a client record with 422 formType.mismatch', async () => {
    const service = await createTemplate(ctx, ana, 'service', 'Serviço padrão');

    await expectRecordError(
      createRecord(ctx, ana.tenantId, service, { values: {}, type: 'client' }),
      { status: 422, code: 'formType.mismatch', field: 'formId' },
    );
    expect(await recordRows(ctx.pool, service.id)).toHaveLength(0);
  });

  it('AC-0003-12 rejects a client template for a service record with 422 formType.mismatch', async () => {
    const client = await createTemplate(ctx, ana, 'client', 'Ficha');

    await expectRecordError(
      createRecord(ctx, ana.tenantId, client, { values: {}, type: 'service' }),
      { status: 422, code: 'formType.mismatch', field: 'formId' },
    );
    expect(await recordRows(ctx.pool, client.id)).toHaveLength(0);
  });
});
