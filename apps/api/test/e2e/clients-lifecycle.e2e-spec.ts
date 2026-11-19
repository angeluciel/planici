import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClientSummary } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  signUpOwner,
  valueRowCount,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  createTemplate,
  recordRowOf,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import {
  clientRow,
  clientsApi,
  createClientVia,
  FakeClientHistory,
  readClient,
  seedClient,
  userIdOf,
} from '../utils/clients-fixtures.js';

// E-life: inactivate, reactivate and delete (SPEC-0004 plan, Tests)

let ctx: TestContext;
let history: FakeClientHistory;
let historyCtx: TestContext;
let ana: Session;
let bia: Session;
let ficha: RecordTemplate;

const asAna = () => clientsApi(ctx.app, ana);
const asAnaWithHistory = () => clientsApi(historyCtx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
  history = new FakeClientHistory();
  historyCtx = await createTestApp({ clientHistory: history });
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
  ficha = await createTemplate(ctx, ana, 'client', 'Ficha', [
    { label: 'Hobby', type: 'text' },
  ]);
});

afterAll(async () => {
  await ctx?.close();
  await historyCtx?.close();
});

const seedAna = (status: 'active' | 'inactive' = 'active') =>
  seedClient(ctx.pool, {
    tenantId: ana.tenantId,
    userId: userIdOf(ana),
    formId: ficha.id,
    name: 'Ana Souza',
    email: 'ana@example.com',
    status,
  });

describe('inactivate and reactivate', () => {
  it('AC-0004-12 inactivates the client, hides it from the default list and shows it under the inactive filter', async () => {
    const { id } = await seedAna();

    const response = await asAna().inactivate(id).expect(200);

    expect(response.body).toMatchObject({ id, status: 'inactive' });
    const active = await asAna().list().expect(200);
    expect(active.body.clients).toEqual([]);
    const inactive = await asAna().list({ status: 'inactive' }).expect(200);
    expect(
      inactive.body.clients.map((client: ClientSummary) => [
        client.name,
        client.status,
      ]),
    ).toEqual([['Ana Souza', 'inactive']]);
  });

  it('AC-0004-13 reactivates an inactive client', async () => {
    const { id } = await seedAna('inactive');

    const response = await asAna().reactivate(id).expect(200);

    expect(response.body).toMatchObject({ id, status: 'active' });
    expect((await readClient(ctx, ana, id)).status).toBe('active');
  });

  it('AC-0004-36 rejects inactivating an inactive client with client.status-unchanged', async () => {
    const { id } = await seedAna('inactive');

    const response = await asAna().inactivate(id).expect(409);

    expect(response.body).toEqual({ error: 'client.status-unchanged' });
    expect((await readClient(ctx, ana, id)).status).toBe('inactive');
  });
});

describe('delete', () => {
  it('AC-0004-14 deletes the client after the typed name, with its record and values', async () => {
    const created = await createClientVia(
      ctx,
      ana,
      ficha,
      { name: 'Ana Souza', email: 'ana@example.com' },
      { [ficha.fieldId('Hobby')]: 'Corrida' },
    );
    const row = await clientRow(ctx.pool, created.id);
    const recordId = row!.form_record_id;
    expect(await valueRowCount(ctx.pool, { recordId })).toBe(1);

    await asAna().remove(created.id, { confirmName: 'Ana Souza' }).expect(204);

    const read = await asAna().read(created.id).expect(404);
    expect(read.body).toEqual({ error: 'client.not-found' });
    expect(await clientRow(ctx.pool, created.id)).toBeNull();
    expect(await recordRowOf(ctx.pool, recordId)).toBeNull();
    expect(await valueRowCount(ctx.pool, { recordId })).toBe(0);
  });

  it('AC-0004-54 rejects a typed name that differs from the client name and keeps the client', async () => {
    const { id } = await seedAna();

    const response = await asAna()
      .remove(id, { confirmName: 'Ana' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'deleteConfirmation.required',
      field: 'confirmName',
    });
    await asAna().read(id).expect(200);
  });

  // partly (G-2): the history is a fake ClientHistoryReader, no appointment exists
  it('AC-0004-15 partly: rejects the delete of a client with history with client.has-history and keeps it', async () => {
    const { id } = await seedAna();
    history.setHistory(id);

    const response = await asAnaWithHistory()
      .remove(id, { confirmName: 'Ana Souza' })
      .expect(409);

    expect(response.body).toEqual({ error: 'client.has-history' });
    await asAna().read(id).expect(200);
    expect(await clientRow(ctx.pool, id)).not.toBeNull();
  });

  // partly (G-2): the API half, with a fake ClientHistoryReader; the view page is W-cview
  it('AC-0004-33 partly: the read of a client with history reports hasHistory true', async () => {
    const { id } = await seedAna();

    const without = await asAnaWithHistory().read(id).expect(200);
    history.setHistory(id);
    const withHistory = await asAnaWithHistory().read(id).expect(200);

    expect(without.body.hasHistory).toBe(false);
    expect(withHistory.body.hasHistory).toBe(true);
  });
});

describe('tenant isolation and authentication', () => {
  it("AC-0004-16 answers 404 client.not-found to inactivate, reactivate and delete of another tenant's client and leaves it unchanged", async () => {
    const theirs = await createTemplate(ctx, bia, 'client', 'Ficha');
    const { id } = await seedClient(ctx.pool, {
      tenantId: bia.tenantId,
      userId: userIdOf(bia),
      formId: theirs.id,
      name: 'Bia Lima',
      email: 'bia@example.com',
    });
    const before = await clientRow(ctx.pool, id);

    const inactivated = await asAna().inactivate(id).expect(404);
    const reactivated = await asAna().reactivate(id).expect(404);
    const deleted = await asAna()
      .remove(id, { confirmName: 'Bia Lima' })
      .expect(404);

    for (const response of [inactivated, reactivated, deleted]) {
      expect(response.body).toEqual({ error: 'client.not-found' });
    }
    expect(await clientRow(ctx.pool, id)).toEqual(before);
  });

  it('AC-0004-45 answers 401 to inactivate, reactivate and delete without an access token', async () => {
    const { id } = await seedAna();
    const anonymous = clientsApi(ctx.app, { tenantId: ana.tenantId });
    const before = await clientRow(ctx.pool, id);

    await anonymous.inactivate(id).expect(401);
    await anonymous.reactivate(id).expect(401);
    await anonymous.remove(id, { confirmName: 'Ana Souza' }).expect(401);

    expect(await clientRow(ctx.pool, id)).toEqual(before);
  });
});
