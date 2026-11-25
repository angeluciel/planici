import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ServiceSummary } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  formsApi,
  signUpOwner,
  valueRowCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  createTemplate,
  recordRowOf,
  setRevision,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import {
  createServiceVia,
  FakeServiceHistory,
  readService,
  seedService,
  serviceRow,
  servicesApi,
} from '../utils/services-fixtures.js';

// E-slife: inactivate, reactivate, delete, history, cascades
// (SPEC-0005 plan, Tests)

let ctx: TestContext;
let history: FakeServiceHistory;
let historyCtx: TestContext;
let ana: Session;
let ficha: RecordTemplate;

const asAna = () => servicesApi(ctx.app, ana);
const asAnaWithHistory = () => servicesApi(historyCtx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
  history = new FakeServiceHistory();
  // depends on the `serviceHistory` option the implementer adds to createTestApp
  historyCtx = await createTestApp({ serviceHistory: history });
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  ficha = await createTemplate(ctx, ana, 'service', 'Ficha', [
    { label: 'Observação', type: 'text' },
  ]);
});

afterAll(async () => {
  await ctx?.close();
  await historyCtx?.close();
});

const seedAna = (
  status: 'active' | 'inactive' = 'active',
  name = 'Sessão individual',
  updatedAt?: string,
) =>
  seedService(ctx.pool, {
    tenantId: ana.tenantId,
    formId: ficha.id,
    name,
    status,
    updatedAt,
  });

describe('inactivate and reactivate', () => {
  it('AC-0005-13 inactivates the service, hides it from the default list and shows it under the inactive filter', async () => {
    const { id } = await seedAna();

    const response = await asAna().inactivate(id).expect(200);

    expect(response.body).toMatchObject({ id, status: 'inactive' });
    const active = await asAna().list().expect(200);
    expect(active.body.services).toEqual([]);
    const inactive = await asAna().list({ status: 'inactive' }).expect(200);
    expect(
      inactive.body.services.map((service: ServiceSummary) => [
        service.name,
        service.status,
      ]),
    ).toEqual([['Sessão individual', 'inactive']]);
  });

  it('AC-0005-29 reactivates an inactive service', async () => {
    const { id } = await seedAna('inactive');

    const response = await asAna().reactivate(id).expect(200);

    expect(response.body).toMatchObject({ id, status: 'active' });
    expect((await readService(ctx, ana, id)).status).toBe('active');
  });

  it('AC-0005-30 rejects inactivating an inactive service with service.status-unchanged', async () => {
    const { id } = await seedAna('inactive');

    const response = await asAna().inactivate(id).expect(409);

    expect(response.body).toEqual({ error: 'service.status-unchanged' });
    expect((await readService(ctx, ana, id)).status).toBe('inactive');
  });

  it('AC-0005-74 reports a later updatedAt after the inactivation', async () => {
    const { id } = await seedAna(
      'active',
      'Sessão individual',
      '2020-01-01T10:00:00Z',
    );
    const before = await readService(ctx, ana, id);

    const response = await asAna().inactivate(id).expect(200);

    expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(
      Date.parse(before.updatedAt),
    );
  });

  it('AC-0003-82 keeps the revision when the service is inactivated (service side)', async () => {
    const created = await createServiceVia(ctx, ana, ficha);
    const { form_record_id: recordId } = (await serviceRow(
      ctx.pool,
      created.id,
    ))!;
    await setRevision(ctx.pool, recordId, 2);

    await asAna().inactivate(created.id).expect(200);

    const current = await readService(ctx, ana, created.id);
    expect(current.status).toBe('inactive');
    expect(current.revision).toBe(2);
  });
});

describe('delete', () => {
  it('AC-0005-14 deletes the service after the typed name, with its record and values', async () => {
    const created = await createServiceVia(
      ctx,
      ana,
      ficha,
      { name: 'Sessão individual' },
      { [ficha.fieldId('Observação')]: 'Trazer exames' },
    );
    const recordId = (await serviceRow(ctx.pool, created.id))!.form_record_id;
    expect(await valueRowCount(ctx.pool, { recordId })).toBe(1);

    await asAna()
      .remove(created.id, { confirmName: 'Sessão individual' })
      .expect(204);

    const read = await asAna().read(created.id).expect(404);
    expect(read.body).toEqual({ error: 'service.not-found' });
  });

  // SPEC-0001 Persistence, services (no AC id): both rows are gone
  it('SPEC-0001 Persistence: after a service delete, the services row, the form_records row and its values are gone', async () => {
    const created = await createServiceVia(
      ctx,
      ana,
      ficha,
      { name: 'Sessão individual' },
      { [ficha.fieldId('Observação')]: 'Trazer exames' },
    );
    const recordId = (await serviceRow(ctx.pool, created.id))!.form_record_id;

    await asAna()
      .remove(created.id, { confirmName: 'Sessão individual' })
      .expect(204);

    expect(await serviceRow(ctx.pool, created.id)).toBeNull();
    expect(await recordRowOf(ctx.pool, recordId)).toBeNull();
    expect(await valueRowCount(ctx.pool, { recordId })).toBe(0);
  });

  it('AC-0005-31 rejects a typed name that differs from the service name and keeps the service', async () => {
    const { id } = await seedAna();

    const response = await asAna()
      .remove(id, { confirmName: 'Sessão' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    await asAna().read(id).expect(200);
    expect(await serviceRow(ctx.pool, id)).not.toBeNull();
  });

  // partly (G-3): the history is a fake ServiceHistoryReader, no appointment exists
  it('AC-0005-15 partly: rejects the delete of a service with history with service.has-history and keeps it', async () => {
    const { id } = await seedAna();
    history.setHistory(id);

    const response = await asAnaWithHistory()
      .remove(id, { confirmName: 'Sessão individual' })
      .expect(409);

    expect(response.body).toEqual({ error: 'service.has-history' });
    await asAna().read(id).expect(200);
    expect(await serviceRow(ctx.pool, id)).not.toBeNull();
  });

  // partly (G-3): the API half, with a fake ServiceHistoryReader
  it('AC-0005-58 partly: reads hasHistory true for a service with history and false for one without', async () => {
    const withHistory = await seedAna('active', 'Sessão individual');
    const without = await seedAna('active', 'Avaliação');
    history.setHistory(withHistory.id);

    const first = await asAnaWithHistory().read(withHistory.id).expect(200);
    const second = await asAnaWithHistory().read(without.id).expect(200);

    expect(first.body.hasHistory).toBe(true);
    expect(second.body.hasHistory).toBe(false);
  });
});

describe('template delete with "Sim, excluir tudo"', () => {
  // SPEC-0005 §4.4 and SPEC-0001 Persistence, template delete (no AC id)
  it('§4.4: deletes the services of a service template and their form_records rows with deleteRecords and the typed name', async () => {
    const first = await seedAna('active', 'Sessão individual');
    const second = await seedAna('inactive', 'Avaliação');
    const other = await createTemplate(ctx, ana, 'service', 'Outro');
    const kept = await seedService(ctx.pool, {
      tenantId: ana.tenantId,
      formId: other.id,
      name: 'Retorno',
    });

    await formsApi(ctx.app, ana)
      .remove(ficha.id, { deleteRecords: true, confirmName: 'Ficha' })
      .expect(204);

    for (const gone of [first, second]) {
      const response = await asAna().read(gone.id).expect(404);
      expect(response.body).toEqual({ error: 'service.not-found' });
      expect(await serviceRow(ctx.pool, gone.id)).toBeNull();
      expect(await recordRowOf(ctx.pool, gone.formRecordId)).toBeNull();
    }
    await asAna().read(kept.id).expect(200);
    expect(await recordRowOf(ctx.pool, kept.formRecordId)).not.toBeNull();
  });
});
