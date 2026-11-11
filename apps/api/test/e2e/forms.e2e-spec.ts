import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  CLIENT_SYSTEM_FIELDS,
  countForms,
  createClientBody,
  dbFor,
  ERASURE_TABLES,
  FakeRecordHistory,
  formRow,
  formsApi,
  manyCustomFields,
  rowsPerTable,
  seedForm,
  seedManyForms,
  seedRecord,
  seedRecords,
  signUpOwner,
  type Session,
} from '../utils/forms-fixtures.js';

// E-crud: create, list, read and tenant isolation (SPEC-0001 plan, Tests)

let ctx: TestContext;
let ana: Session;
let bia: Session;

const db = () => dbFor(ctx.pool);
const asAna = () => formsApi(ctx.app, ana);

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

describe('create', () => {
  it('AC-0001-01 creates version 1 at revision 1 with the client system fields in order', async () => {
    const response = await asAna()
      .create(createClientBody('Anamnese inicial'))
      .expect(201);

    expect(response.body).toMatchObject({
      type: 'client',
      name: 'Anamnese inicial',
      status: 'active',
      version: 1,
      revision: 1,
    });
    expect(
      response.body.fields.map(
        (field: { systemKey: string; label: string; type: string }) => [
          field.systemKey,
          field.label,
          field.type,
        ],
      ),
    ).toEqual([
      ['client.name', 'Nome completo', 'full_name'],
      ['client.email', 'E-mail', 'email'],
      ['client.phone', 'Telefone', 'phone'],
    ]);
    expect(
      response.body.fields.map(
        (field: { required: boolean }) => field.required,
      ),
    ).toEqual([true, true, false]);

    const stored = await formRow(ctx.pool, response.body.id);
    expect(stored).toMatchObject({
      tenant_id: ana.tenantId,
      latest_version: 1,
      revision: 1,
    });
  });

  it('AC-0001-02 rejects a create request without a type and stores nothing', async () => {
    const { type: _type, ...withoutType } = createClientBody('Ficha');

    const response = await asAna().create(withoutType).expect(422);

    expect(response.body).toEqual({
      error: 'formType.invalid',
      field: 'type',
    });
    expect(await countForms(ctx.pool, ana.tenantId)).toBe(0);
  });

  it('AC-0001-03 rejects a blank name', async () => {
    const response = await asAna().create(createClientBody('   ')).expect(422);

    expect(response.body).toEqual({
      error: 'formName.required',
      field: 'name',
    });
  });

  it('AC-0001-04 rejects a name of 81 characters', async () => {
    const response = await asAna()
      .create(createClientBody('a'.repeat(81)))
      .expect(422);

    expect(response.body).toEqual({ error: 'formName.max', field: 'name' });
  });

  it('AC-0001-05 rejects a name taken by an archived template, ignoring case and accents', async () => {
    await seedForm(db(), {
      tenantId: ana.tenantId,
      name: 'Anamnese',
      type: 'service',
      status: 'archived',
    });

    const response = await asAna()
      .create(createClientBody(' anamnése '))
      .expect(409);

    expect(response.body).toEqual({ error: 'formName.taken', field: 'name' });
    expect(await countForms(ctx.pool, ana.tenantId)).toBe(1);
  });

  it('AC-0001-06 allows a name another tenant already uses', async () => {
    await seedForm(db(), { tenantId: bia.tenantId, name: 'Anamnese' });

    await asAna().create(createClientBody('Anamnese')).expect(201);
  });

  it('AC-0001-19 rejects a create request with 101 fields', async () => {
    const response = await asAna()
      .create({
        type: 'client',
        name: 'Ficha',
        fields: manyCustomFields(101),
      })
      .expect(422);

    expect(response.body).toEqual({ error: 'formFields.max', field: 'fields' });
    expect(await countForms(ctx.pool, ana.tenantId)).toBe(0);
  });

  it('§6 rejects a create request without a fields key as systemField.missing', async () => {
    const { fields: _fields, ...withoutFields } = createClientBody('Ficha');

    const response = await asAna().create(withoutFields).expect(422);

    expect(response.body).toEqual({
      error: 'systemField.missing',
      field: 'fields',
    });
    expect(await countForms(ctx.pool, ana.tenantId)).toBe(0);
  });

  it('AC-0001-44 rejects a description of 501 characters', async () => {
    const response = await asAna()
      .create(createClientBody('Ficha', [], { description: 'a'.repeat(501) }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'formDescription.max',
      field: 'description',
    });
  });

  it('AC-0001-48 rejects the 201st template, archived ones included, and keeps 200', async () => {
    await seedManyForms(ctx.pool, ana.tenantId, 200, 60);

    const response = await asAna()
      .create(createClientBody('Ficha'))
      .expect(400);

    expect(response.body).toEqual({ error: 'form.limit-reached' });
    expect(await countForms(ctx.pool, ana.tenantId)).toBe(200);
  });
});

describe('list', () => {
  it('AC-0001-16 requires an access token', async () => {
    await request(ctx.app.getHttpServer()).get('/v1/forms').expect(401);
  });

  it('AC-0001-41 lists only the active tenant templates', async () => {
    await seedForm(db(), { tenantId: ana.tenantId, name: 'Anamnese' });
    await seedForm(db(), { tenantId: bia.tenantId, name: 'Avaliação' });

    const response = await asAna()
      .list({ includeArchived: 'true' })
      .expect(200);

    const names = response.body.forms.map(
      (form: { name: string }) => form.name,
    );
    expect(names).toContain('Anamnese');
    expect(names).not.toContain('Avaliação');
  });

  it('AC-0001-43 refuses a suspended tenant', async () => {
    await ctx.pool.query(
      "update tenants set status = 'suspended' where id = $1",
      [ana.tenantId],
    );

    const response = await asAna().list().expect(403);

    expect(response.body).toEqual({ error: 'tenant.inactive' });
  });

  it('AC-0001-52 sorts by name ignoring case and accents, grouped by type', async () => {
    for (const name of ['Ética', 'anamnese', 'Ficha']) {
      await seedForm(db(), { tenantId: ana.tenantId, name, type: 'client' });
    }
    await seedForm(db(), {
      tenantId: ana.tenantId,
      name: 'Serviço',
      type: 'service',
    });

    const response = await asAna().list().expect(200);

    const byType = (type: string) =>
      response.body.forms
        .filter((form: { type: string }) => form.type === type)
        .map((form: { name: string }) => form.name);
    expect(byType('client')).toEqual(['anamnese', 'Ética', 'Ficha']);
    expect(byType('service')).toEqual(['Serviço']);
  });

  it('AC-0001-59 filters by type', async () => {
    await seedForm(db(), { tenantId: ana.tenantId, name: 'Cliente' });
    await seedForm(db(), { tenantId: ana.tenantId, name: 'Ficha' });
    await seedForm(db(), {
      tenantId: ana.tenantId,
      name: 'Serviço',
      type: 'service',
    });

    const response = await asAna().list({ type: 'client' }).expect(200);

    expect(
      response.body.forms.map((form: { name: string }) => form.name).sort(),
    ).toEqual(['Cliente', 'Ficha']);
  });

  it('AC-0001-60 rejects a type filter that is not client or service', async () => {
    const response = await asAna().list({ type: 'plan' }).expect(422);

    expect(response.body).toEqual({
      error: 'formType.invalid',
      field: 'type',
    });
  });

  it('AC-0001-61 rejects an includeArchived filter that is not true or false', async () => {
    const response = await asAna()
      .list({ includeArchived: 'maybe' })
      .expect(422);

    expect(response.body).toEqual({
      error: 'includeArchived.invalid',
      field: 'includeArchived',
    });
  });

  it('AC-0001-62 requires a tenant context', async () => {
    const response = await formsApi(ctx.app, { token: ana.token })
      .list()
      .expect(400);

    expect(response.body).toEqual({ error: 'tenant.required' });
  });
});

describe('read', () => {
  it('AC-0001-72 answers 404 form.not-found to a malformed id', async () => {
    const response = await asAna().read('abc').expect(404);

    expect(response.body).toEqual({ error: 'form.not-found' });
  });
});

describe('tenant isolation', () => {
  it('AC-0001-15 hides another tenant template from read, update, archive and delete', async () => {
    const theirs = await seedForm(db(), {
      tenantId: bia.tenantId,
      name: 'Ficha',
    });
    await seedRecord(db(), { form: theirs, version: 1 });

    const responses = [
      await asAna().read(theirs.id),
      await asAna().update(theirs.id, { revision: 1, name: 'Hijacked' }),
      await asAna().archive(theirs.id),
      await asAna().remove(theirs.id, { confirmName: 'Ficha' }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'form.not-found' });
    }
    expect(await formRow(ctx.pool, theirs.id)).toMatchObject({
      name: 'Ficha',
      status: 'active',
      revision: 1,
    });
  });

  it('AC-0001-40 hides another tenant archived template from unarchive, version read and preview', async () => {
    const theirs = await seedForm(db(), {
      tenantId: bia.tenantId,
      name: 'Ficha',
      status: 'archived',
    });

    const responses = [
      await asAna().unarchive(theirs.id),
      await asAna().version(theirs.id, 1),
      await asAna().preview(theirs.id, { revision: 1, fields: [] }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'form.not-found' });
    }
    expect(await formRow(ctx.pool, theirs.id)).toMatchObject({
      status: 'archived',
      revision: 1,
    });
  });

  it('AC-0001-42 does not create in a tenant the caller has no membership in', async () => {
    const response = await asAna()
      .create(createClientBody('Ficha'))
      .set('X-Tenant-Id', bia.tenantId)
      .expect(404);

    expect(response.body).toEqual({ error: 'tenant.not-found' });
    expect(await countForms(ctx.pool, bia.tenantId)).toBe(0);
  });
});

describe('with a RecordHistoryReader fake', () => {
  let history: FakeRecordHistory;
  let historyCtx: TestContext;

  beforeAll(async () => {
    history = new FakeRecordHistory();
    historyCtx = await createTestApp({ recordHistory: history });
  });

  afterAll(async () => {
    await historyCtx?.close();
  });

  it('AC-0001-58 reports recordCount 3 and recordsWithHistory 1 on read and list (partial, see Deferred checks)', async () => {
    const form = await seedForm(db(), {
      tenantId: ana.tenantId,
      name: 'Ficha',
    });
    await seedRecords(db(), form, [1, 1, 1]);
    history.setHistory(form.id, 1);

    const api = formsApi(historyCtx.app, ana);
    const read = await api.read(form.id).expect(200);
    const list = await api.list().expect(200);

    expect(read.body).toMatchObject({ recordCount: 3, recordsWithHistory: 1 });
    expect(
      list.body.forms.find((item: { id: string }) => item.id === form.id),
    ).toMatchObject({ recordCount: 3, recordsWithHistory: 1 });
  });
});

describe('tenant erasure', () => {
  it('RNF-14 deleting the tenant row removes every forms row of that tenant and no one else', async () => {
    const seeds = [];
    for (const tenant of [ana, bia]) {
      const form = await seedForm(db(), {
        tenantId: tenant.tenantId,
        name: 'Ficha',
        versions: [
          [
            ...CLIENT_SYSTEM_FIELDS,
            { label: 'Turno', type: 'select', options: ['Manhã', 'Tarde'] },
            { label: 'Hobby', type: 'text' },
          ],
          [
            ...CLIENT_SYSTEM_FIELDS,
            { label: 'Turno', type: 'select', options: ['Manhã'] },
          ],
        ],
      });
      await seedRecord(db(), {
        form,
        version: 1,
        answers: { Hobby: 'Xadrez', Turno: 'Tarde' },
      });
      seeds.push(form);
    }
    const biaBefore = await rowsPerTable(ctx.pool, bia.tenantId);
    const anaBefore = await rowsPerTable(ctx.pool, ana.tenantId);
    for (const table of ERASURE_TABLES) {
      expect(anaBefore[table], `seed of ${table}`).toBeGreaterThan(0);
    }

    await ctx.pool.query('delete from tenants where id = $1', [ana.tenantId]);

    const anaAfter = await rowsPerTable(ctx.pool, ana.tenantId);
    for (const table of ERASURE_TABLES) {
      expect(anaAfter[table], table).toBe(0);
    }
    expect(await rowsPerTable(ctx.pool, bia.tenantId)).toEqual(biaBefore);
  });
});
