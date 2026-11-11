import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_FIELDS,
  dbFor,
  failUpdatesOfRecord,
  formRow,
  formsApi,
  inputsFrom,
  manyCustomFields,
  recordRows,
  seedForm,
  seedRecord,
  seedRecords,
  signUpOwner,
  valueRowCount,
  versionCount,
  type SeededForm,
  type Session,
} from '../utils/forms-fixtures.js';

// E-ver: update, publish, Apply, preview and version read (SPEC-0001 plan, Tests)

let ctx: TestContext;
let ana: Session;

const db = () => dbFor(ctx.pool);
const asAna = () => formsApi(ctx.app, ana);

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

// the fields of a seeded template as the editor would send them back, by id
async function currentInputs(form: SeededForm) {
  const read = await asAna().read(form.id).expect(200);
  return { inputs: inputsFrom(read.body.fields), body: read.body };
}

const newField = (label: string, extra: object = {}) => ({
  label,
  type: 'text',
  ...extra,
});

async function seedFicha(
  versions: Parameters<typeof seedForm>[1]['versions'] = [CLIENT_SYSTEM_FIELDS],
  extra: { name?: string; revision?: number } = {},
) {
  return seedForm(db(), {
    tenantId: ana.tenantId,
    name: extra.name ?? 'Ficha',
    revision: extra.revision ?? 1,
    versions,
  });
}

describe('update, shape and revision', () => {
  it('AC-0001-07 rejects a type on update and keeps the template', async () => {
    const form = await seedFicha(undefined, { revision: 3 });

    const response = await asAna()
      .update(form.id, { revision: 3, type: 'service' })
      .expect(422);

    expect(response.body).toEqual({
      error: 'formType.immutable',
      field: 'type',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      type: 'client',
      revision: 3,
    });
  });

  it('AC-0001-08 rejects the save of a stale tab and keeps the first save', async () => {
    const form = await seedFicha(undefined, { revision: 3 });

    const tabA = await asAna()
      .update(form.id, { revision: 3, name: 'Ficha da aba A' })
      .expect(200);
    expect(tabA.body.revision).toBe(4);

    const tabB = await asAna()
      .update(form.id, { revision: 3, name: 'Ficha da aba B' })
      .expect(409);

    expect(tabB.body).toEqual({
      error: 'form.revision-conflict',
      field: 'revision',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      name: 'Ficha da aba A',
      revision: 4,
    });
  });

  it('AC-0001-09 rejects a blank label at fields.3.label and keeps the name', async () => {
    const form = await seedFicha([
      [...CLIENT_SYSTEM_FIELDS, { label: 'Objetivo', type: 'text' }],
    ]);
    const { inputs } = await currentInputs(form);
    inputs[3] = { ...inputs[3]!, label: '   ' };

    const response = await asAna()
      .update(form.id, { revision: 1, name: 'Ficha nova', fields: inputs })
      .expect(422);

    expect(response.body).toEqual({
      error: 'fieldLabel.required',
      field: 'fields.3.label',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({ name: 'Ficha' });
  });

  it('AC-0001-19 rejects an update with 101 fields and keeps the template', async () => {
    const form = await seedFicha();

    const response = await asAna()
      .update(form.id, { revision: 1, fields: manyCustomFields(101) })
      .expect(422);

    expect(response.body).toEqual({ error: 'formFields.max', field: 'fields' });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      revision: 1,
      latest_version: 1,
    });
  });

  it('AC-0001-45 rejects an update without revision and keeps the template', async () => {
    const form = await seedFicha(undefined, { revision: 3 });

    const response = await asAna()
      .update(form.id, { name: 'Ficha nova' })
      .expect(422);

    expect(response.body).toEqual({
      error: 'formRevision.required',
      field: 'revision',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      name: 'Ficha',
      revision: 3,
    });
  });

  it('AC-0001-74 rejects a rename to a name another template has', async () => {
    const form = await seedFicha(undefined, { revision: 2 });
    await seedFicha(undefined, { name: 'Anamnese' });

    const response = await asAna()
      .update(form.id, { revision: 2, name: 'anamnese' })
      .expect(409);

    expect(response.body).toEqual({ error: 'formName.taken', field: 'name' });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      name: 'Ficha',
      revision: 2,
    });
  });

  it('AC-0001-75 accepts a rename that only changes the case of its own name', async () => {
    const form = await seedFicha(undefined, { revision: 2 });

    const response = await asAna()
      .update(form.id, { revision: 2, name: 'FICHA' })
      .expect(200);

    expect(response.body).toMatchObject({ name: 'FICHA', revision: 3 });
  });
});

describe('metadata and publication', () => {
  it('AC-0001-20 stores a metadata-only save on every version and publishes nothing', async () => {
    const form = await seedFicha([
      [...CLIENT_SYSTEM_FIELDS, { label: 'Objetivo', type: 'text' }],
      [
        ...CLIENT_SYSTEM_FIELDS,
        { label: 'Objetivo', type: 'text' },
        { label: 'Hobby', type: 'text' },
      ],
    ]);
    const records = await seedRecords(db(), form, [2, 2, 2, 2, 2]);
    const { inputs } = await currentInputs(form);
    const fields = inputs.map((field) =>
      field.label === 'Objetivo'
        ? { ...field, label: 'Meta principal', sensitive: true }
        : field,
    );

    const response = await asAna()
      .update(form.id, { revision: 1, name: 'Ficha renomeada', fields })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Ficha renomeada',
      version: 2,
      revision: 2,
    });
    expect(await versionCount(ctx.pool, form.id)).toBe(2);
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows).toHaveLength(records.length);
    expect(rows.every((row) => row.form_version_id === form.versionId(2))).toBe(
      true,
    );
    const versionOne = await asAna().version(form.id, 1).expect(200);
    expect(
      versionOne.body.fields.map((field: { label: string }) => field.label),
    ).toContain('Meta principal');
  });

  it('AC-0001-21 publishes the next version of a template without records', async () => {
    const form = await seedFicha();
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: [...inputs, newField('Objetivo')],
      })
      .expect(200);

    expect(response.body).toMatchObject({ version: 2, revision: 2 });
    expect(response.body.fields.at(-1)).toMatchObject({ label: 'Objetivo' });
    expect(await versionCount(ctx.pool, form.id)).toBe(2);
  });

  it('AC-0001-22 requires a migration mode when a schema change meets records', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: [...inputs, newField('Objetivo')],
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'migration.mode-required',
      field: 'migration.mode',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 1,
      revision: 1,
    });
    expect(await versionCount(ctx.pool, form.id)).toBe(1);
  });

  it('AC-0001-23 keeps existing records on their version when applying with "keep"', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: [...inputs, newField('Objetivo')],
        migration: { mode: 'keep' },
      })
      .expect(200);

    expect(response.body.version).toBe(2);
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 2,
    });
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows.map((row) => row.form_version_id)).toEqual([
      form.versionId(1),
      form.versionId(1),
      form.versionId(1),
    ]);
    const versionOne = await asAna().version(form.id, 1).expect(200);
    expect(
      versionOne.body.fields.map((field: { label: string }) => field.label),
    ).not.toContain('Objetivo');
  });

  it('AC-0001-24 moves every record, on any version, with "update_all"', async () => {
    const form = await seedFicha([
      CLIENT_SYSTEM_FIELDS,
      CLIENT_SYSTEM_FIELDS,
      CLIENT_SYSTEM_FIELDS,
    ]);
    await seedRecords(db(), form, [1, 1, 3]);
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: [...inputs, newField('Objetivo')],
        migration: { mode: 'update_all' },
      })
      .expect(200);

    expect(response.body.version).toBe(4);
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.form_version_id).toBe(await versionIdOf(form.id, 4));
      expect(row.revision).toBe(2);
    }
  });

  it('AC-0001-46 rejects a migration mode that is not keep or update_all', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: [...inputs, newField('Objetivo')],
        migration: { mode: 'replace' },
      })
      .expect(422);

    expect(response.body).toEqual({
      error: 'migration.mode-invalid',
      field: 'migration.mode',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 1,
    });
  });
});

async function versionIdOf(formId: string, number: number): Promise<string> {
  const { rows } = await ctx.pool.query(
    'select id from form_versions where form_id = $1 and number = $2',
    [formId, number],
  );
  return rows[0]?.id as string;
}

// "Ficha" at version 1 with 4 records, 2 of them with a "Hobby" answer
async function seedFichaWithHobby() {
  const form = await seedFicha([
    [...CLIENT_SYSTEM_FIELDS, { label: 'Hobby', type: 'text' }],
  ]);
  const records = await seedRecords(
    db(),
    form,
    [1, 1, 1, 1],
    (index): Record<string, string> => (index < 2 ? { Hobby: 'Xadrez' } : {}),
  );
  const withoutHobby = async () => {
    const { inputs } = await currentInputs(form);
    return inputs.filter((field) => field.label !== 'Hobby');
  };
  return { form, records, withoutHobby };
}

describe('"Atualizar todos" with lost answers', () => {
  it('AC-0001-26 rejects update_all without confirmName and keeps both answers', async () => {
    const { form, withoutHobby } = await seedFichaWithHobby();

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: await withoutHobby(),
        migration: { mode: 'update_all' },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'migration.confirmation-required',
      field: 'migration.confirmName',
    });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 1,
    });
    expect(await valueRowCount(ctx.pool, { formId: form.id })).toBe(2);
  });

  it('AC-0001-26 rejects update_all with a confirmName that differs in case', async () => {
    const { form, withoutHobby } = await seedFichaWithHobby();

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: await withoutHobby(),
        migration: { mode: 'update_all', confirmName: 'ficha' },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'migration.confirmation-required',
      field: 'migration.confirmName',
    });
    expect(await valueRowCount(ctx.pool, { formId: form.id })).toBe(2);
  });

  it('AC-0001-27 migrates every record and drops the Hobby answers after the typed name', async () => {
    const { form, withoutHobby } = await seedFichaWithHobby();

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields: await withoutHobby(),
        migration: { mode: 'update_all', confirmName: 'Ficha' },
      })
      .expect(200);

    expect(response.body.version).toBe(2);
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows).toHaveLength(4);
    const versionTwo = await versionIdOf(form.id, 2);
    expect(rows.every((row) => row.form_version_id === versionTwo)).toBe(true);
    expect(await valueRowCount(ctx.pool, { formId: form.id })).toBe(0);
  });

  it('AC-0001-28 stores nothing when migrating one record fails', async () => {
    const form = await seedFicha();
    const records = await seedRecords(db(), form, [1, 1, 1]);
    const { inputs } = await currentInputs(form);
    const dropTrigger = await failUpdatesOfRecord(ctx.pool, records[1]!.id);

    try {
      const response = await asAna()
        .update(form.id, {
          revision: 1,
          fields: [...inputs, newField('Objetivo')],
          migration: { mode: 'update_all' },
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'unexpected' });
    } finally {
      await dropTrigger();
    }

    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 1,
      revision: 1,
    });
    expect(await versionCount(ctx.pool, form.id)).toBe(1);
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.form_version_id === form.versionId(1))).toBe(
      true,
    );
  });
});

describe('version read', () => {
  it('AC-0001-29 still returns the removed Hobby field in version 1', async () => {
    const { form, withoutHobby } = await seedFichaWithHobby();

    await asAna()
      .update(form.id, {
        revision: 1,
        fields: await withoutHobby(),
        migration: { mode: 'keep' },
      })
      .expect(200);
    const response = await asAna().version(form.id, 1).expect(200);

    expect(response.body.version).toBe(1);
    expect(
      response.body.fields.map((field: { label: string }) => field.label),
    ).toEqual(['Nome completo', 'E-mail', 'Telefone', 'Hobby']);
  });

  it('AC-0001-36 answers 404 formVersion.not-found to a version that is not published', async () => {
    const form = await seedFicha([CLIENT_SYSTEM_FIELDS, CLIENT_SYSTEM_FIELDS]);

    const response = await asAna().version(form.id, 3).expect(404);

    expect(response.body).toEqual({ error: 'formVersion.not-found' });
  });

  it('AC-0001-73 answers 404 formVersion.not-found to a malformed version', async () => {
    const form = await seedFicha([CLIENT_SYSTEM_FIELDS, CLIENT_SYSTEM_FIELDS]);

    const response = await asAna().version(form.id, 'abc').expect(404);

    expect(response.body).toEqual({ error: 'formVersion.not-found' });
  });

  it('§5 answers 404 formVersion.not-found to a non-canonical version such as 0x10', async () => {
    const form = await seedFicha([CLIENT_SYSTEM_FIELDS, CLIENT_SYSTEM_FIELDS]);

    for (const version of ['0x10', '1e0', '%202']) {
      const response = await asAna().version(form.id, version).expect(404);

      expect(response.body).toEqual({ error: 'formVersion.not-found' });
    }
  });

  it('AC-0001-76 reports version 3 with 3 records of which 2 are on older versions', async () => {
    const form = await seedFicha([
      CLIENT_SYSTEM_FIELDS,
      CLIENT_SYSTEM_FIELDS,
      CLIENT_SYSTEM_FIELDS,
    ]);
    await seedRecords(db(), form, [1, 1, 3]);

    const response = await asAna().read(form.id).expect(200);

    expect(response.body).toMatchObject({
      version: 3,
      recordCount: 3,
      recordsOnOlderVersions: 2,
    });
  });
});

describe('preview', () => {
  it('AC-0001-19 rejects a preview with 101 fields', async () => {
    const form = await seedFicha();

    const response = await asAna()
      .preview(form.id, { revision: 1, fields: manyCustomFields(101) })
      .expect(422);

    expect(response.body).toEqual({ error: 'formFields.max', field: 'fields' });
  });

  it('AC-0001-37 counts the records a change would touch and stores nothing', async () => {
    const { form, withoutHobby } = await seedFichaWithHobby();
    await ctx.pool.query('update forms set revision = 4 where id = $1', [
      form.id,
    ]);

    const response = await asAna()
      .preview(form.id, {
        revision: 4,
        fields: [
          ...(await withoutHobby()),
          newField('Objetivo', { required: true }),
        ],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      schemaChanged: true,
      nextVersion: 2,
      recordCount: 4,
      recordsLosingAnswers: 2,
      recordsGainingRequiredFields: 4,
    });
    expect(response.body.removed).toEqual([
      expect.objectContaining({ label: 'Hobby', valueCount: 2 }),
    ]);
    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      latest_version: 1,
      revision: 4,
    });
    expect(await versionCount(ctx.pool, form.id)).toBe(1);
  });

  it('AC-0001-38 rejects a preview based on an outdated revision', async () => {
    const form = await seedFicha(undefined, { revision: 4 });
    const { inputs } = await currentInputs(form);

    const response = await asAna()
      .preview(form.id, { revision: 3, fields: inputs })
      .expect(409);

    expect(response.body).toEqual({
      error: 'form.revision-conflict',
      field: 'revision',
    });
  });

  it('AC-0001-39 rejects a preview with a blank label at fields.3.label', async () => {
    const form = await seedFicha(
      [[...CLIENT_SYSTEM_FIELDS, { label: 'Objetivo', type: 'text' }]],
      { revision: 4 },
    );
    const { inputs } = await currentInputs(form);
    inputs[3] = { ...inputs[3]!, label: ' ' };

    const response = await asAna()
      .preview(form.id, { revision: 4, fields: inputs })
      .expect(422);

    expect(response.body).toEqual({
      error: 'fieldLabel.required',
      field: 'fields.3.label',
    });
  });

  it('AC-0001-71 lists the added, removed and changed fields', async () => {
    const form = await seedFicha(
      [
        [
          ...CLIENT_SYSTEM_FIELDS,
          { label: 'Hobby', type: 'text' },
          { label: 'Objetivo', type: 'text', required: false },
        ],
      ],
      { revision: 4 },
    );
    const { inputs } = await currentInputs(form);
    const next = inputs
      .filter((field) => field.label !== 'Hobby')
      .map((field) =>
        field.label === 'Objetivo' ? { ...field, required: true } : field,
      );

    const response = await asAna()
      .preview(form.id, {
        revision: 4,
        // "Peso" is a SPEC-0002 section 3.4 term, so it is sent protected
        fields: [...next, newField('Peso', { sensitive: true })],
      })
      .expect(200);

    expect(response.body.added).toEqual([
      expect.objectContaining({ label: 'Peso', type: 'text' }),
    ]);
    expect(response.body.removed).toEqual([
      expect.objectContaining({ id: form.fieldId('Hobby'), label: 'Hobby' }),
    ]);
    expect(response.body.changed).toEqual([
      expect.objectContaining({
        id: form.fieldId('Objetivo'),
        label: 'Objetivo',
        changes: ['required'],
      }),
    ]);
  });
});

describe('preview, client.phone pending (SystemFieldPresence fake)', () => {
  let ids: string[] = [];
  let presenceCtx: TestContext;

  beforeAll(async () => {
    presenceCtx = await createTestApp({
      systemFieldPresence: {
        findRecordIdsWithoutClientPhone: () => Promise.resolve(ids),
      },
    });
  });

  afterAll(async () => {
    await presenceCtx?.close();
  });

  const phoneRequired = (required: boolean) =>
    CLIENT_SYSTEM_FIELDS.map((field) =>
      field.systemKey === 'client.phone' ? { ...field, required } : field,
    );

  // "Ficha" at version 2, one record on each version; phone optional in v1
  async function seedTwoRecords(latestRequiresPhone: boolean) {
    const form = await seedFicha([
      phoneRequired(false),
      phoneRequired(latestRequiresPhone),
    ]);
    const [older, latest] = await seedRecords(db(), form, [1, 2]);
    return { form, older: older!, latest: latest! };
  }

  const previewWithObjetivo = async (formId: string) => {
    const api = formsApi(presenceCtx.app, ana);
    const read = await api.read(formId).expect(200);
    // "Objetivo" is optional, so only client.phone can leave records pending
    return api
      .preview(formId, {
        revision: 1,
        fields: [...inputsFrom(read.body.fields), newField('Objetivo')],
      })
      .expect(200);
  };

  it('§4.7 step 4 counts a record whose own version has phone optional, not one whose version requires it', async () => {
    const { form, older, latest } = await seedTwoRecords(true);
    ids = [older.id, latest.id];

    const response = await previewWithObjetivo(form.id);

    expect(response.body).toMatchObject({
      recordCount: 2,
      recordsGainingRequiredFields: 1,
    });
  });

  it('§4.7 step 4 does not count a record of another tenant that the presence port returns', async () => {
    const { form, older, latest } = await seedTwoRecords(true);
    const bia = await signUpOwner(ctx, 'studio-bia');
    const theirs = await seedForm(db(), {
      tenantId: bia.tenantId,
      name: 'Ficha',
      versions: [phoneRequired(false)],
    });
    const foreign = await seedRecord(db(), { form: theirs, version: 1 });
    ids = [older.id, latest.id, foreign.id];

    const response = await previewWithObjetivo(form.id);

    expect(response.body).toMatchObject({
      recordCount: 2,
      recordsGainingRequiredFields: 1,
    });
  });

  it('§4.7 step 4 counts nothing when the next version leaves phone optional', async () => {
    const { form, older, latest } = await seedTwoRecords(false);
    ids = [older.id, latest.id];

    const response = await previewWithObjetivo(form.id);

    expect(response.body).toMatchObject({
      recordCount: 2,
      recordsGainingRequiredFields: 0,
    });
  });
});

describe('records on older versions', () => {
  // "Ficha" is at version 2; its only record was kept on version 1. It answers
  // "Hobby" (removed by version 2) and "Tarde" to the required select "Turno".
  async function seedOlderRecord() {
    const turno = (options: string[]) => ({
      label: 'Turno',
      type: 'select',
      required: true,
      options,
    });
    const form = await seedFicha([
      [
        ...CLIENT_SYSTEM_FIELDS,
        { label: 'Hobby', type: 'text' },
        turno(['Manhã', 'Tarde', 'Noite']),
      ],
      [...CLIENT_SYSTEM_FIELDS, turno(['Manhã', 'Tarde', 'Noite'])],
    ]);
    const record = await seedRecord(db(), {
      form,
      version: 1,
      answers: { Hobby: 'Xadrez', Turno: 'Tarde' },
    });

    // the next version drops the option "Tarde" and adds a required "Objetivo"
    const { inputs } = await currentInputs(form);
    const next = inputs.map((field) =>
      field.label === 'Turno'
        ? {
            ...field,
            // a select keeps at least 2 options (SPEC-0002 §3.1)
            options: [
              { id: form.optionId('Turno', 'Manhã'), label: 'Manhã' },
              { id: form.optionId('Turno', 'Noite'), label: 'Noite' },
            ],
          }
        : field,
    );
    const fields = [...next, newField('Objetivo', { required: true })];
    return { form, record, fields };
  }

  it('R18 previews lost answers and pending required fields of a record kept on an older version', async () => {
    const { form, fields } = await seedOlderRecord();

    const response = await asAna()
      .preview(form.id, { revision: 1, fields })
      .expect(200);

    expect(response.body).toMatchObject({
      recordCount: 1,
      recordsLosingAnswers: 1,
      recordsGainingRequiredFields: 1,
    });
  });

  it('R18 rejects update_all without confirmName and keeps the Hobby answer', async () => {
    const { form, record, fields } = await seedOlderRecord();

    const response = await asAna()
      .update(form.id, {
        revision: 1,
        fields,
        migration: { mode: 'update_all' },
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'migration.confirmation-required',
      field: 'migration.confirmName',
    });
    expect(
      await valueRowCount(ctx.pool, {
        recordId: record.id,
        fieldId: form.fieldId('Hobby'),
      }),
    ).toBe(1);
  });

  it('R18 update_all with the template name removes the Hobby and Turno answers of that record', async () => {
    const { form, record, fields } = await seedOlderRecord();

    await asAna()
      .update(form.id, {
        revision: 1,
        fields,
        migration: { mode: 'update_all', confirmName: 'Ficha' },
      })
      .expect(200);

    expect(await valueRowCount(ctx.pool, { recordId: record.id })).toBe(0);
    const rows = await recordRows(ctx.pool, form.id);
    expect(rows[0]!.form_version_id).toBe(await versionIdOf(form.id, 3));
  });
});
