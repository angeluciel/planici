import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FieldInput } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  formsApi,
  signUpOwner,
  valueRowCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  RECORD_TYPES,
  changeTemplate,
  createRecord,
  createTemplate,
  expectRecordError,
  inTenant,
  loadTemplate,
  presenceFor,
  readRecord,
  recordService,
  setRevision,
  updateRecord,
  withField,
  type RecordTemplate,
} from '../utils/records-fixtures.js';

// I-mig: records after SPEC-0001's PATCH /v1/forms/:formId (metadata,
// "Manter existentes", "Atualizar todos"), read through RecordService and
// GET /v1/forms/:formId/versions/:version (SPEC-0003 plan, Tests).

let ctx: TestContext;
let ana: Session;

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
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

const KEEP = { mode: 'keep' } as const;
const UPDATE_ALL = { mode: 'update_all', confirmName: 'Ficha' } as const;

describe.each(RECORD_TYPES)(
  'records after a template change (%s template)',
  (type) => {
    const ficha = (custom: FieldInput[] = []) =>
      createTemplate(ctx, ana, type, 'Ficha', custom);

    const create = (
      template: RecordTemplate,
      values: Record<string, unknown> = {},
    ) => createRecord(ctx, ana.tenantId, template, { values });

    const read = (id: string, phone = true) =>
      readRecord(ctx, ana.tenantId, id, presenceFor(type, phone));

    const versionRead = async (template: RecordTemplate, version: number) => {
      const response = await formsApi(ctx.app, ana)
        .version(template.id, version)
        .expect(200);
      return response.body as {
        version: number;
        fields: {
          id: string;
          label: string;
          sensitive: boolean;
          options: { id: string; label: string }[] | null;
        }[];
      };
    };

    const add =
      (...fields: FieldInput[]) =>
      (inputs: FieldInput[]) => [...inputs, ...fields];

    const without = (label: string) => (inputs: FieldInput[]) =>
      inputs.filter((input) => input.label !== label);

    describe('metadata changes', () => {
      it('AC-0003-15 keeps the version and shows the new label with the stored value', async () => {
        const template = await ficha([text('Profissão')]);
        const profession = template.fieldId('Profissão');
        const id = await create(template, { [profession]: 'Engenheira' });

        const renamed = await changeTemplate(ctx, ana, template, (inputs) =>
          withField(inputs, 'Profissão', { label: 'Ocupação' }),
        );

        expect(renamed.version).toBe(1);
        const version = await versionRead(renamed, 1);
        expect(
          version.fields.find((field) => field.id === profession)?.label,
        ).toBe('Ocupação');
        const record = await read(id);
        expect(record.form.version).toBe(1);
        expect(record.values).toEqual({ [profession]: 'Engenheira' });
      });

      it('AC-0003-84 labels the stored option with its new name in version 1 and keeps the answer', async () => {
        const first = await ficha([SHIFT]);
        const shift = first.fieldId('Turno');
        const afternoon = first.optionId('Turno', 'Tarde');
        const id = await create(first, { [shift]: afternoon });
        const second = await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          KEEP,
        );
        expect(second.version).toBe(2);

        const renamed = await changeTemplate(ctx, ana, second, (inputs) =>
          inputs.map((input) =>
            input.label === 'Turno'
              ? {
                  ...input,
                  options: input.options?.map((option) =>
                    option.id === afternoon
                      ? { ...option, label: 'Vespertino' }
                      : option,
                  ),
                }
              : input,
          ),
        );

        expect(renamed.version).toBe(2);
        const version = await versionRead(renamed, 1);
        expect(
          version.fields
            .find((field) => field.id === shift)
            ?.options?.find((option) => option.id === afternoon)?.label,
        ).toBe('Vespertino');
        const record = await read(id);
        expect(record.form.version).toBe(1);
        expect(record.values).toEqual({ [shift]: afternoon });
      });

      it('AC-0003-85 marks the field protected in version 1 when protection is turned on in the latest', async () => {
        const first = await ficha([text('Hobby')]);
        const hobby = first.fieldId('Hobby');
        const id = await create(first, { [hobby]: 'Corrida' });
        const second = await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          KEEP,
        );
        expect(second.version).toBe(2);

        const protectedTemplate = await changeTemplate(
          ctx,
          ana,
          second,
          (inputs) => withField(inputs, 'Hobby', { sensitive: true }),
        );

        expect(protectedTemplate.version).toBe(2);
        const version = await versionRead(protectedTemplate, 1);
        expect(
          version.fields.find((field) => field.id === hobby)?.sensitive,
        ).toBe(true);
        expect((await read(id)).form.version).toBe(1);
      });
    });

    describe('"Manter existentes"', () => {
      it('AC-0003-16 keeps the record on version 1 with its Hobby answer after Hobby is removed', async () => {
        const first = await ficha([text('Hobby')]);
        const hobby = first.fieldId('Hobby');
        const id = await create(first, { [hobby]: 'Corrida' });

        const second = await changeTemplate(
          ctx,
          ana,
          first,
          without('Hobby'),
          KEEP,
        );

        expect(second.version).toBe(2);
        const record = await read(id);
        expect(record.form).toMatchObject({ version: 1, latestVersion: 2 });
        expect(record.values).toEqual({ [hobby]: 'Corrida' });
        expect(
          (await versionRead(second, 1)).fields.map((field) => field.id),
        ).toContain(hobby);
        expect(
          (await versionRead(second, 2)).fields.map((field) => field.id),
        ).not.toContain(hobby);
      });

      it('AC-0003-25 reports version 1 with latestVersion 2 for a record left behind', async () => {
        const first = await ficha();
        const id = await create(first);

        const second = await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          KEEP,
        );

        expect(second.version).toBe(2);
        expect((await read(id)).form).toMatchObject({
          id: first.id,
          version: 1,
          latestVersion: 2,
        });
        expect(
          (await versionRead(second, 1)).fields.map((field) => field.label),
        ).not.toContain('Objetivo');
      });

      it('AC-0003-30 rejects a value for a field only version 2 has on a record on version 1', async () => {
        const first = await ficha();
        const id = await create(first);
        const second = await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          KEEP,
        );
        const goal = second.fieldId('Objetivo');

        await expectRecordError(
          updateRecord(ctx, ana.tenantId, id, type, {
            values: { [goal]: 'Ganhar massa' },
            formVersion: 1,
            revision: 1,
          }),
          { status: 400, code: 'value.unknown-field', field: `values.${goal}` },
        );
        expect((await read(id)).revision).toBe(1);
      });

      it('support: a removed option stays in version 1 and on the record that holds it', async () => {
        const first = await ficha([SHIFT]);
        const shift = first.fieldId('Turno');
        const afternoon = first.optionId('Turno', 'Tarde');
        const id = await create(first, { [shift]: afternoon });

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
          KEEP,
        );

        expect(second.version).toBe(2);
        const record = await read(id);
        expect(record.form.version).toBe(1);
        expect(record.values).toEqual({ [shift]: afternoon });
        const options = (await versionRead(second, 1)).fields.find(
          (field) => field.id === shift,
        )?.options;
        expect(options?.map((option) => option.label)).toContain('Tarde');
      });
    });

    describe('"Atualizar todos"', () => {
      it('AC-0003-24 moves the record to version 2, keeps Profissão and drops the Objetivo answer', async () => {
        const first = await ficha([text('Profissão'), text('Objetivo')]);
        const profession = first.fieldId('Profissão');
        const goal = first.fieldId('Objetivo');
        const id = await create(first, {
          [profession]: 'Engenheira',
          [goal]: 'Ganhar massa',
        });

        const second = await changeTemplate(
          ctx,
          ana,
          first,
          without('Objetivo'),
          UPDATE_ALL,
        );

        expect(second.version).toBe(2);
        const record = await read(id);
        expect(record.form).toMatchObject({ version: 2, latestVersion: 2 });
        expect(record.values).toEqual({ [profession]: 'Engenheira' });
        expect(
          await valueRowCount(ctx.pool, { recordId: id, fieldId: goal }),
        ).toBe(0);
      });

      it('AC-0003-45 drops the answer of a select whose option was removed', async () => {
        const first = await ficha([SHIFT]);
        const shift = first.fieldId('Turno');
        const afternoon = first.optionId('Turno', 'Tarde');
        const id = await create(first, { [shift]: afternoon });

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
        const record = await read(id);
        expect(record.form.version).toBe(2);
        expect(record.values[shift]).toBeUndefined();
        expect(
          await valueRowCount(ctx.pool, { recordId: id, fieldId: shift }),
        ).toBe(0);
      });

      it('AC-0003-81 raises the revision from 2 to 3', async () => {
        const first = await ficha();
        const id = await create(first);
        await setRevision(ctx.pool, id, 2);

        await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          UPDATE_ALL,
        );

        const record = await read(id);
        expect(record.form.version).toBe(2);
        expect(record.revision).toBe(3);
      });

      it('AC-0003-26 rejects a save with formVersion 1 and revision 3 after the migration, and changes nothing', async () => {
        const first = await ficha([text('Hobby')]);
        const hobby = first.fieldId('Hobby');
        const id = await create(first, { [hobby]: 'Corrida' });
        await setRevision(ctx.pool, id, 3);
        await changeTemplate(
          ctx,
          ana,
          first,
          add(text('Objetivo')),
          UPDATE_ALL,
        );
        expect((await read(id)).revision).toBe(4);

        await expectRecordError(
          updateRecord(ctx, ana.tenantId, id, type, {
            values: { [hobby]: 'Natação' },
            formVersion: 1,
            revision: 3,
          }),
          { status: 409, code: 'record.form-changed', field: 'formVersion' },
        );

        const record = await read(id);
        expect(record.form.version).toBe(2);
        expect(record.revision).toBe(4);
        expect(record.values).toEqual({ [hobby]: 'Corrida' });
      });

      describe('a field turned required', () => {
        const migratedWithoutProfession = async () => {
          const first = await ficha([text('Profissão')]);
          const id = await create(first);
          const second = await changeTemplate(
            ctx,
            ana,
            first,
            (inputs) => withField(inputs, 'Profissão', { required: true }),
            UPDATE_ALL,
          );
          return {
            id,
            template: second,
            profession: second.fieldId('Profissão'),
          };
        };

        it('AC-0003-17 rejects an update without the pending required field', async () => {
          const { id, template, profession } =
            await migratedWithoutProfession();
          expect(template.version).toBe(2);

          await expectRecordError(
            updateRecord(ctx, ana.tenantId, id, type, {
              values: {},
              formVersion: 2,
              revision: 2,
            }),
            {
              status: 422,
              code: 'value.required',
              field: `values.${profession}`,
            },
          );
          expect((await read(id)).revision).toBe(2);
        });

        it('AC-0003-89 lists the pending field in missingRequired before any edit', async () => {
          const { id, profession } = await migratedWithoutProfession();

          const record = await read(id);

          expect(record.form.version).toBe(2);
          expect(record.missingRequired).toEqual([profession]);
        });
      });
    });
  },
);

// client only: client.phone is the only system field that can be optional
// (SPEC-0002 R3)
describe('a client template that makes Telefone required', () => {
  const phoneRequired = async () => {
    const first = await createTemplate(ctx, ana, 'client', 'Ficha');
    const id = await createRecord(ctx, ana.tenantId, first, { values: {} });
    const second = await changeTemplate(
      ctx,
      ana,
      first,
      (inputs) => withField(inputs, 'Telefone', { required: true }),
      UPDATE_ALL,
    );
    return {
      id,
      template: second,
      phoneId: second.systemFieldId('client.phone'),
    };
  };

  it('AC-0003-73 reports version 2 and lists Telefone in missingRequired when the client has no phone', async () => {
    const { id, template, phoneId } = await phoneRequired();
    expect(template.version).toBe(2);

    const record = await readRecord(ctx, ana.tenantId, id, {
      'client.phone': false,
    });

    expect(record.form.version).toBe(2);
    expect(record.missingRequired).toContain(phoneId);
  });

  it('AC-0003-74 partly: the draft of the migrated client marks client.phone required', async () => {
    const { id } = await phoneRequired();

    // phone.required itself is SPEC-0004's; here the version says it is required
    const required = await inTenant(ctx, ana.tenantId, async (tx) => {
      const draft = await recordService(ctx).openForUpdate(
        tx,
        ana.tenantId,
        id,
        'client',
        { formVersion: 2, revision: 2 },
      );
      return draft.isRequired('client.phone');
    });

    expect(required).toBe(true);
  });

  it('AC-0003-74 partly: the draft of an unmigrated client marks client.phone optional', async () => {
    const first = await createTemplate(ctx, ana, 'client', 'Ficha');
    const id = await createRecord(ctx, ana.tenantId, first, { values: {} });

    const required = await inTenant(ctx, ana.tenantId, async (tx) => {
      const draft = await recordService(ctx).openForUpdate(
        tx,
        ana.tenantId,
        id,
        'client',
        { formVersion: 1, revision: 1 },
      );
      return draft.isRequired('client.phone');
    });

    expect(required).toBe(false);
    expect((await loadTemplate(ctx, ana, first)).version).toBe(1);
  });
});
