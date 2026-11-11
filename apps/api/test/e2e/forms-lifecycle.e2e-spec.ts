import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  dbFor,
  FakeRecordHistory,
  formRow,
  formsApi,
  recordRows,
  seedForm,
  seedRecords,
  signUpOwner,
  valueRowCount,
  versionCount,
  type Session,
} from '../utils/forms-fixtures.js';

// E-life: archive, unarchive and delete (SPEC-0001 plan, Tests)

let ctx: TestContext;
let history: FakeRecordHistory;
let historyCtx: TestContext;
let ana: Session;

const db = () => dbFor(ctx.pool);
const asAna = () => formsApi(ctx.app, ana);
const withHistory = () => formsApi(historyCtx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
  history = new FakeRecordHistory();
  historyCtx = await createTestApp({ recordHistory: history });
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
});

afterAll(async () => {
  await ctx?.close();
  await historyCtx?.close();
});

const seedFicha = (status: 'active' | 'archived' = 'active') =>
  seedForm(db(), { tenantId: ana.tenantId, name: 'Ficha', status });

async function tableCount(table: string, formId: string) {
  const { rows } = await ctx.pool.query(
    `select count(*)::int as n from ${table} where ${table === 'forms' ? 'id' : 'form_id'} = $1`,
    [formId],
  );
  return rows[0].n as number;
}

describe('archive and unarchive', () => {
  it('AC-0001-12 archives the template and leaves its record row unchanged', async () => {
    const form = await seedFicha();
    const [record] = await seedRecords(db(), form, [1]);
    const before = await recordRows(ctx.pool, form.id);

    const response = await asAna().archive(form.id).expect(200);

    expect(response.body).toMatchObject({
      id: form.id,
      status: 'archived',
      revision: 2,
    });
    expect(await recordRows(ctx.pool, form.id)).toEqual(before);
    expect(before[0]!.id).toBe(record!.id);
  });

  it('AC-0001-47 rejects archiving an archived template', async () => {
    const form = await seedFicha('archived');

    const response = await asAna().archive(form.id).expect(409);

    expect(response.body).toEqual({ error: 'form.status-unchanged' });
    expect(await formRow(ctx.pool, form.id)).toMatchObject({ revision: 1 });
  });

  it('AC-0001-47 rejects unarchiving an active template', async () => {
    const form = await seedFicha('active');

    const response = await asAna().unarchive(form.id).expect(409);

    expect(response.body).toEqual({ error: 'form.status-unchanged' });
  });

  it('AC-0001-49 unarchives the template and lists it again by default', async () => {
    const form = await seedFicha('archived');

    const response = await asAna().unarchive(form.id).expect(200);

    expect(response.body).toMatchObject({ status: 'active', revision: 2 });
    const list = await asAna().list().expect(200);
    expect(list.body.forms.map((item: { id: string }) => item.id)).toContain(
      form.id,
    );
  });

  it('AC-0001-32 archiving instead of deleting hides the template by default and keeps the records', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);
    const before = await recordRows(ctx.pool, form.id);

    await asAna().archive(form.id).expect(200);

    expect(await formRow(ctx.pool, form.id)).toMatchObject({
      status: 'archived',
    });
    const list = await asAna().list().expect(200);
    expect(
      list.body.forms.map((item: { id: string }) => item.id),
    ).not.toContain(form.id);
    expect(await recordRows(ctx.pool, form.id)).toEqual(before);
  });
});

describe('delete without records', () => {
  it('AC-0001-13 deletes the template after the exact name and then answers 404', async () => {
    const form = await seedFicha();

    await asAna().remove(form.id, { confirmName: 'Ficha' }).expect(204);

    const read = await asAna().read(form.id).expect(404);
    expect(read.body).toEqual({ error: 'form.not-found' });
    expect(await tableCount('forms', form.id)).toBe(0);
    expect(await versionCount(ctx.pool, form.id)).toBe(0);
    expect(await tableCount('form_fields', form.id)).toBe(0);
  });

  it('AC-0001-35 rejects a wrong typed name and keeps the template', async () => {
    const form = await seedFicha();

    const response = await asAna()
      .remove(form.id, { confirmName: 'ficha x' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    await asAna().read(form.id).expect(200);
  });

  it('AC-0001-70 compares the typed name with case', async () => {
    const form = await seedFicha();

    const response = await asAna()
      .remove(form.id, { confirmName: 'ficha' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    await asAna().read(form.id).expect(200);
  });
});

describe('delete with records', () => {
  it('AC-0001-14 answers 409 form.in-use without deleteRecords and keeps template and record', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1]);

    const response = await asAna()
      .remove(form.id, { confirmName: 'Ficha' })
      .expect(409);

    expect(response.body).toEqual({ error: 'form.in-use' });
    expect(await tableCount('forms', form.id)).toBe(1);
    expect(await recordRows(ctx.pool, form.id)).toHaveLength(1);
  });

  it('AC-0001-31 deletes the template and its record rows and values after the typed name', async () => {
    const form = await seedForm(db(), {
      tenantId: ana.tenantId,
      name: 'Ficha',
      versions: [
        [
          {
            systemKey: 'client.name',
            label: 'Nome completo',
            type: 'full_name',
            required: true,
          },
          {
            systemKey: 'client.email',
            label: 'E-mail',
            type: 'email',
            required: true,
          },
          { systemKey: 'client.phone', label: 'Telefone', type: 'phone' },
          { label: 'Hobby', type: 'text' },
        ],
      ],
    });
    await seedRecords(db(), form, [1, 1, 1], () => ({ Hobby: 'Xadrez' }));
    expect(await valueRowCount(ctx.pool, { formId: form.id })).toBe(3);

    await asAna()
      .remove(form.id, { deleteRecords: true, confirmName: 'Ficha' })
      .expect(204);

    const read = await asAna().read(form.id).expect(404);
    expect(read.body).toEqual({ error: 'form.not-found' });
    expect(await recordRows(ctx.pool, form.id)).toHaveLength(0);
    expect(await valueRowCount(ctx.pool, { formId: form.id })).toBe(0);
    expect(await tableCount('forms', form.id)).toBe(0);
  });

  it('AC-0001-33 rejects deleteRecords with a wrong typed name and keeps everything', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);

    const response = await asAna()
      .remove(form.id, { deleteRecords: true, confirmName: 'ficha x' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    expect(await tableCount('forms', form.id)).toBe(1);
    expect(await recordRows(ctx.pool, form.id)).toHaveLength(3);
  });

  it('AC-0001-34 answers 409 form.records-have-history and deletes nothing (partial, see Deferred checks)', async () => {
    const form = await seedFicha();
    await seedRecords(db(), form, [1, 1, 1]);
    history.setHistory(form.id, 1);

    const response = await withHistory()
      .remove(form.id, { deleteRecords: true, confirmName: 'Ficha' })
      .expect(409);

    expect(response.body).toEqual({ error: 'form.records-have-history' });
    expect(await tableCount('forms', form.id)).toBe(1);
    expect(await recordRows(ctx.pool, form.id)).toHaveLength(3);
  });
});
