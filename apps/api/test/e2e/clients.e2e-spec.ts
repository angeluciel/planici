import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { DomainExceptionFilter } from '@shared/http/domain-exception.filter.js';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import { signUpOwner, type Session } from '../utils/forms-fixtures.js';
import {
  captureProcessOutput,
  countRecords,
  createTemplate,
} from '../utils/records-fixtures.js';
import {
  clientBody,
  clientRow,
  clientsApi,
  countClients,
  countClientsWithEmail,
  createClientVia,
  createPhoneRequiredTemplate,
  defaultTemplate,
  readClient,
  seedClient,
  updateBody,
  userIdOf,
} from '../utils/clients-fixtures.js';

// E-cl: create, read, update, consent, attributes, uniqueness, logs
// (SPEC-0004 plan, Tests)

let ctx: TestContext;
let versionCtx: TestContext;
// Nest binds `filter.catch` when the app initialises, so a spy made after that
// never sees a call; AC-0004-74 reads this one, made before the apps start
let filterSpy: MockInstance<DomainExceptionFilter['catch']>;
let ana: Session;
let bia: Session;

const asAna = () => clientsApi(ctx.app, ana);
const cliente = () => defaultTemplate(ctx, ana);

beforeAll(async () => {
  filterSpy = vi.spyOn(DomainExceptionFilter.prototype, 'catch');
  ctx = await createTestApp();
  // the current consent text version is "2" (AC-0004-55)
  versionCtx = await createTestApp({ consentTextVersion: '2' });
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
});

afterAll(async () => {
  await ctx?.close();
  await versionCtx?.close();
  filterSpy?.mockRestore();
});

async function expectNothingStored() {
  expect(await countClients(ctx.pool, ana.tenantId)).toBe(0);
  expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
}

describe('create', () => {
  it('AC-0004-04 creates a client with the name and e-mail normalised, phone null and status active', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(
        clientBody(template, {
          name: '  Ana   Souza ',
          email: ' ANA@Example.com ',
        }),
      )
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@example.com',
      phone: null,
      status: 'active',
    });
  });

  it('AC-0004-05 rejects an empty name with clientName.required', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, { name: '' }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'clientName.required',
      field: 'name',
    });
  });

  it('AC-0004-06 rejects the e-mail "ana@" with email.invalid', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, { email: 'ana@' }))
      .expect(422);

    expect(response.body).toEqual({ error: 'email.invalid', field: 'email' });
  });

  it('AC-0004-37 rejects a name of 121 characters with clientName.max', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, { name: 'a'.repeat(121) }))
      .expect(422);

    expect(response.body).toEqual({ error: 'clientName.max', field: 'name' });
  });

  it('AC-0004-38 rejects a blank e-mail with email.required', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, { email: '   ' }))
      .expect(422);

    expect(response.body).toEqual({ error: 'email.required', field: 'email' });
  });

  it('AC-0004-39 rejects the phone "(11) 8765-43210" with phone.invalid', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, { phone: '(11) 8765-43210' }))
      .expect(422);

    expect(response.body).toEqual({ error: 'phone.invalid', field: 'phone' });
  });

  it('AC-0004-09 rejects a missing phone when the template makes it required', async () => {
    const template = await createPhoneRequiredTemplate(ctx, ana);

    const response = await asAna().create(clientBody(template)).expect(422);

    expect(response.body).toEqual({ error: 'phone.required', field: 'phone' });
    await expectNothingStored();
  });

  it('AC-0004-07 rejects an e-mail held by an inactive client of the tenant and stores nothing new', async () => {
    const template = await cliente();
    await seedClient(ctx.pool, {
      tenantId: ana.tenantId,
      userId: userIdOf(ana),
      formId: template.id,
      name: 'Ana Souza',
      email: 'ana@example.com',
      status: 'inactive',
    });
    const recordsBefore = await countRecords(ctx.pool, ana.tenantId);

    const response = await asAna()
      .create(
        clientBody(template, { name: 'Outra Ana', email: 'ANA@example.com ' }),
      )
      .expect(409);

    expect(response.body).toEqual({
      error: 'clientEmail.taken',
      field: 'email',
    });
    expect(
      await countClientsWithEmail(ctx.pool, ana.tenantId, 'ana@example.com'),
    ).toBe(1);
    expect(await countRecords(ctx.pool, ana.tenantId)).toBe(recordsBefore);
  });

  it('AC-0004-08 accepts an e-mail that another tenant uses', async () => {
    const theirs = await defaultTemplate(ctx, bia);
    await seedClient(ctx.pool, {
      tenantId: bia.tenantId,
      userId: userIdOf(bia),
      formId: theirs.id,
      name: 'Ana Souza',
      email: 'ana@example.com',
    });
    const template = await cliente();

    await asAna()
      .create(clientBody(template, { email: 'ana@example.com' }))
      .expect(201);
  });

  it('AC-0004-20 lets exactly one of two simultaneous creates with the same e-mail win', async () => {
    const template = await cliente();
    const first = asAna().create(
      clientBody(template, { name: 'Ana Souza', email: 'ana@example.com' }),
    );
    const second = asAna().create(
      clientBody(template, { name: 'Ana Lima', email: 'ana@example.com' }),
    );

    // both requests are in flight before either response is awaited
    const responses = await Promise.all([first, second]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    const loser = responses.find((response) => response.status === 409)!;
    expect(loser.body).toEqual({ error: 'clientEmail.taken', field: 'email' });
    expect(
      await countClientsWithEmail(ctx.pool, ana.tenantId, 'ana@example.com'),
    ).toBe(1);
    // the rejected create leaves no orphan record
    expect(await countRecords(ctx.pool, ana.tenantId)).toBe(1);
  });

  it('AC-0004-59 reports cpf.invalid before clientEmail.taken', async () => {
    await createClientVia(ctx, ana, await cliente(), {
      email: 'ana@example.com',
    });
    const ficha = await createTemplate(ctx, ana, 'client', 'Ficha', [
      { label: 'Documento', type: 'cpf' },
    ]);
    const cpf = ficha.fieldId('Documento');

    const response = await asAna()
      .create(
        clientBody(
          ficha,
          { email: 'ana@example.com' },
          { [cpf]: '123.456.789-00' },
        ),
      )
      .expect(422);

    expect(response.body).toEqual({
      error: 'cpf.invalid',
      field: `values.${cpf}`,
    });
  });

  it('AC-0004-17 answers 401 to a list and a create without an access token', async () => {
    const template = await cliente();
    const anonymous = clientsApi(ctx.app, { tenantId: ana.tenantId });

    await anonymous.list().expect(401);
    await anonymous.create(clientBody(template)).expect(401);
    expect(await countClients(ctx.pool, ana.tenantId)).toBe(0);
  });
});

describe('consent', () => {
  it('AC-0004-24 records who attested, when and with which text version', async () => {
    const template = await cliente();
    const before = Date.now();

    const response = await asAna().create(clientBody(template)).expect(201);

    const after = Date.now();
    const { consentAttestation } = response.body;
    expect(consentAttestation.attestedBy).toBe(userIdOf(ana));
    expect(consentAttestation.textVersion).toBe('1');
    const attestedAt = new Date(consentAttestation.attestedAt).getTime();
    expect(attestedAt).toBeGreaterThanOrEqual(before);
    expect(attestedAt).toBeLessThanOrEqual(after);
  });

  it('AC-0004-25 rejects a create without consentAttested and stores nothing', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, {}, {}, { consentAttested: undefined }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentAttested.required',
      field: 'consentAttested',
    });
    await expectNothingStored();
  });

  it('AC-0004-26 rejects consentAttested false and stores nothing', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, {}, {}, { consentAttested: false }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentAttested.required',
      field: 'consentAttested',
    });
    await expectNothingStored();
  });

  it('AC-0004-56 rejects a create without consentTextVersion and stores nothing', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(clientBody(template, {}, {}, { consentTextVersion: undefined }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentTextVersion.required',
      field: 'consentTextVersion',
    });
    await expectNothingStored();
  });

  it('AC-0004-58 reports consentAttested.required before a blank name', async () => {
    const template = await cliente();

    const response = await asAna()
      .create(
        clientBody(template, { name: '' }, {}, { consentAttested: false }),
      )
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentAttested.required',
      field: 'consentAttested',
    });
  });

  it('AC-0004-55 rejects a text version that is not the current one and stores nothing', async () => {
    const session = await signUpOwner(versionCtx, 'studio-versao');
    const template = await createTemplate(
      versionCtx,
      session,
      'client',
      'Ficha',
    );

    const response = await clientsApi(versionCtx.app, session)
      .create(clientBody(template, {}, {}, { consentTextVersion: '1' }))
      .expect(409);

    expect(response.body).toEqual({
      error: 'consentText.outdated',
      field: 'consentTextVersion',
    });
    expect(await countClients(versionCtx.pool, session.tenantId)).toBe(0);
    expect(await countRecords(versionCtx.pool, session.tenantId)).toBe(0);
  });

  it('AC-0004-27 keeps the attestation as stored when the name is updated', async () => {
    const created = await createClientVia(ctx, ana, await cliente());
    await ctx.pool.query(
      "update clients set consent_attested_at = '2026-11-09T10:00:00Z' where id = $1",
      [created.id],
    );

    const response = await asAna()
      .update(created.id, updateBody(created, { name: 'Ana Maria Souza' }))
      .expect(200);

    expect(response.body.name).toBe('Ana Maria Souza');
    expect(response.body.consentAttestation.attestedBy).toBe(userIdOf(ana));
    expect(response.body.consentAttestation.textVersion).toBe('1');
    expect(
      new Date(response.body.consentAttestation.attestedAt).toISOString(),
    ).toBe('2026-11-09T10:00:00.000Z');
  });

  it('AC-0004-28 rejects consentAttested on update and leaves the client unchanged', async () => {
    const created = await createClientVia(ctx, ana, await cliente());
    const before = await clientRow(ctx.pool, created.id);

    const response = await asAna()
      .update(
        created.id,
        updateBody(created, { name: 'Outro Nome', consentAttested: true }),
      )
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentAttested.not-allowed',
      field: 'consentAttested',
    });
    expect(await clientRow(ctx.pool, created.id)).toEqual(before);
    expect(await readClient(ctx, ana, created.id)).toEqual(created);
  });

  it('AC-0004-75 rejects consentTextVersion on update and leaves the client unchanged', async () => {
    const created = await createClientVia(ctx, ana, await cliente());
    const before = await clientRow(ctx.pool, created.id);

    const response = await asAna()
      .update(
        created.id,
        updateBody(created, { name: 'Outro Nome', consentTextVersion: '1' }),
      )
      .expect(422);

    expect(response.body).toEqual({
      error: 'consentTextVersion.not-allowed',
      field: 'consentTextVersion',
    });
    expect(await clientRow(ctx.pool, created.id)).toEqual(before);
    expect(await readClient(ctx, ana, created.id)).toEqual(created);
  });
});

describe('update and uniqueness', () => {
  it('AC-0004-41 rejects an update to an e-mail another client holds and keeps the e-mail', async () => {
    const template = await cliente();
    await createClientVia(ctx, ana, template, {
      name: 'Ana Souza',
      email: 'ana@example.com',
    });
    const bruno = await createClientVia(ctx, ana, template, {
      name: 'Bruno Lima',
      email: 'bruno@example.com',
    });

    const response = await asAna()
      .update(bruno.id, updateBody(bruno, { email: 'ana@example.com' }))
      .expect(409);

    expect(response.body).toEqual({
      error: 'clientEmail.taken',
      field: 'email',
    });
    expect((await readClient(ctx, ana, bruno.id)).email).toBe(
      'bruno@example.com',
    );
  });

  it("AC-0004-42 accepts the client's own e-mail in other letter case and lowercases it", async () => {
    const created = await createClientVia(ctx, ana, await cliente(), {
      email: 'ana@example.com',
    });

    const response = await asAna()
      .update(created.id, updateBody(created, { email: 'ANA@Example.com' }))
      .expect(200);

    expect(response.body.email).toBe('ana@example.com');
  });
});

describe('read', () => {
  it('AC-0004-73 answers 404 client.not-found to a malformed client id', async () => {
    const response = await asAna().read('abc').expect(404);

    expect(response.body).toEqual({ error: 'client.not-found' });
  });
});

describe('logs and error tracking', () => {
  it('AC-0004-32 writes no client name or e-mail to any log line and puts no address in the error response', async () => {
    const template = await cliente();
    await seedClient(ctx.pool, {
      tenantId: ana.tenantId,
      userId: userIdOf(ana),
      formId: template.id,
      name: 'Bia Lima',
      email: 'bia@example.com',
    });
    const output = captureProcessOutput();
    let rejected: { body: unknown } | undefined;

    try {
      const created = await asAna()
        .create(
          clientBody(template, {
            name: 'Ana Souza',
            email: 'ana@example.com',
          }),
        )
        .expect(201);
      const id = created.body.id as string;
      await asAna().read(id).expect(200);
      rejected = await asAna()
        .update(id, updateBody(created.body, { email: 'bia@example.com' }))
        .expect(409);
    } finally {
      output.restore();
    }

    const leaked = output.lines.filter((line) =>
      ['Ana Souza', 'ana@example.com', 'bia@example.com'].some((needle) =>
        line.includes(needle),
      ),
    );
    expect(leaked).toEqual([]);
    expect(JSON.stringify(rejected?.body)).not.toMatch(/@/);
  });

  // partly (Risks 1, G-4): the API side only; the code has no Sentry, and
  // Observe's capture is covered through the error that reaches the filter
  it('AC-0004-74 partly: an unexpected failure of the create carries neither the name nor the e-mail', async () => {
    const template = await cliente();
    const constraint = 'test_reject_marker_client';
    // rejects only this tenant's client named "Ana Souza"
    await ctx.pool.query(
      `alter table clients add constraint ${constraint}
         check (not (name = 'Ana Souza' and tenant_id = '${ana.tenantId}'))`,
    );
    const filter = filterSpy;
    filter.mockClear();
    const output = captureProcessOutput();
    let response: { status: number; body: unknown } | undefined;

    try {
      response = await asAna()
        .create(
          clientBody(template, {
            name: 'Ana Souza',
            email: 'ana@example.com',
          }),
        )
        .then((result) => result);
    } finally {
      output.restore();
      await ctx.pool.query(
        `alter table clients drop constraint if exists ${constraint}`,
      );
    }

    expect(response?.status).toBe(500);
    expect(response?.body).toEqual({ error: 'unexpected' });
    const received = filter.mock.calls.map(([error]) => error);
    expect(received).toHaveLength(1);
    const error = received[0] as Error & { cause?: unknown };
    expect(error).toBeInstanceOf(Error);
    // what reaches the filter, the response and the output holds no client data
    const seen = [
      JSON.stringify(response?.body),
      error.message,
      String(error.stack),
      JSON.stringify(Object.entries(error)),
      ...output.lines,
    ].join('\n');
    expect(seen).not.toContain('Ana Souza');
    expect(seen).not.toContain('ana@example.com');
    expect(error.cause).toBeUndefined();
    expect(await countClients(ctx.pool, ana.tenantId)).toBe(0);
    expect(await countRecords(ctx.pool, ana.tenantId)).toBe(0);
  });
});
