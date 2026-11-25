import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import { signUpOwner, type Session } from '../utils/forms-fixtures.js';
import { countRecords, createTemplate } from '../utils/records-fixtures.js';
import { defaultTemplate } from '../utils/clients-fixtures.js';
import {
  countServices,
  createServiceVia,
  defaultServiceTemplate,
  readService,
  seedService,
  serviceBody,
  serviceRow,
  servicesApi,
  serviceUpdateBody,
} from '../utils/services-fixtures.js';

// E-sv: create, read, update, validation, isolation, auth (SPEC-0005 plan, Tests)

let ctx: TestContext;
let ana: Session;
let bia: Session;

const asAna = () => servicesApi(ctx.app, ana);
const servico = () => defaultServiceTemplate(ctx, ana);

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

// an update of a seeded service (revision 1, version 1) that renames it
const UPDATE_OF_SEEDED = {
  revision: 1,
  formVersion: 1,
  name: 'Invasora',
  durationMinutes: 60,
  priceCents: 10000,
  currency: 'BRL',
  values: {},
};

async function expectNothingStored(...sessions: Session[]) {
  for (const session of sessions) {
    expect(await countServices(ctx.pool, session.tenantId)).toBe(0);
    expect(await countRecords(ctx.pool, session.tenantId)).toBe(0);
  }
}

describe('create', () => {
  it('AC-0005-03 creates a service from "Serviço" with its attributes and status active', async () => {
    const template = await servico();

    const response = await asAna()
      .create(
        serviceBody(template, {
          name: 'Sessão individual',
          durationMinutes: 90,
          priceCents: 15000,
          currency: 'BRL',
        }),
      )
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Sessão individual',
      durationMinutes: 90,
      priceCents: 15000,
      currency: 'BRL',
      status: 'active',
    });
  });

  it('AC-0005-22 stores the name trimmed with repeated spaces collapsed', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { name: '  Sessão   individual ' }))
      .expect(201);

    expect(response.body.name).toBe('Sessão individual');
  });

  it('AC-0005-04 rejects a blank name with serviceName.required and stores nothing', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { name: '   ' }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceName.required',
      field: 'name',
    });
    await expectNothingStored(ana);
  });

  it('AC-0005-23 rejects a name of 81 characters with serviceName.max', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { name: 'a'.repeat(81) }))
      .expect(422);

    expect(response.body).toEqual({ error: 'serviceName.max', field: 'name' });
  });

  it('AC-0005-07 rejects a duration of 4 minutes with serviceDuration.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { durationMinutes: 4 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceDuration.invalid',
      field: 'durationMinutes',
    });
  });

  it('AC-0005-08 rejects a duration of 1441 minutes with serviceDuration.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { durationMinutes: 1441 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceDuration.invalid',
      field: 'durationMinutes',
    });
  });

  it('AC-0005-24 rejects a missing duration with serviceDuration.required', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, {}, {}, { durationMinutes: undefined }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceDuration.required',
      field: 'durationMinutes',
    });
  });

  it('AC-0005-25 rejects a duration of 90.5 with serviceDuration.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { durationMinutes: 90.5 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceDuration.invalid',
      field: 'durationMinutes',
    });
  });

  it('AC-0005-09 rejects a price of -1 with servicePrice.negative', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { priceCents: -1 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'servicePrice.negative',
      field: 'priceCents',
    });
  });

  it('AC-0005-10 accepts a price of 0 and reports priceCents 0', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { priceCents: 0 }))
      .expect(201);

    expect(response.body.priceCents).toBe(0);
  });

  it('AC-0005-11 rejects a price of R$ 1.000.000,00 with servicePrice.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { priceCents: 100000000 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'servicePrice.invalid',
      field: 'priceCents',
    });
  });

  it('AC-0005-26 rejects a missing price with servicePrice.required', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, {}, {}, { priceCents: undefined }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'servicePrice.required',
      field: 'priceCents',
    });
  });

  it('AC-0005-27 rejects a price of 15000.5 with servicePrice.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { priceCents: 15000.5 }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'servicePrice.invalid',
      field: 'priceCents',
    });
  });

  it('AC-0005-66 rejects the currency "USD" with serviceCurrency.invalid', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, { currency: 'USD' }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceCurrency.invalid',
      field: 'currency',
    });
  });

  it('AC-0005-67 rejects a missing currency with serviceCurrency.required', async () => {
    const template = await servico();

    const response = await asAna()
      .create(serviceBody(template, {}, {}, { currency: undefined }))
      .expect(422);

    expect(response.body).toEqual({
      error: 'serviceCurrency.required',
      field: 'currency',
    });
  });

  it("AC-0005-34 rejects another tenant's template with formId.invalid and stores nothing in either tenant", async () => {
    const theirs = await createTemplate(ctx, bia, 'service', 'Pilates');

    const response = await asAna().create(serviceBody(theirs)).expect(400);

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
    await expectNothingStored(ana, bia);
  });

  it('AC-0005-35 rejects a client template with formType.mismatch', async () => {
    const cliente = await defaultTemplate(ctx, ana);

    const response = await asAna().create(serviceBody(cliente)).expect(422);

    expect(response.body).toEqual({
      error: 'formType.mismatch',
      field: 'formId',
    });
    await expectNothingStored(ana);
  });
});

describe('name uniqueness', () => {
  it('AC-0005-05 rejects a name held by an inactive service, ignoring case, accents and spaces, and stores nothing new', async () => {
    const template = await servico();
    await seedService(ctx.pool, {
      tenantId: ana.tenantId,
      formId: template.id,
      name: 'Sessão individual',
      status: 'inactive',
    });
    const recordsBefore = await countRecords(ctx.pool, ana.tenantId);

    const response = await asAna()
      .create(serviceBody(template, { name: 'sessao  individual' }))
      .expect(409);

    expect(response.body).toEqual({
      error: 'serviceName.taken',
      field: 'name',
    });
    expect(await countServices(ctx.pool, ana.tenantId)).toBe(1);
    expect(await countRecords(ctx.pool, ana.tenantId)).toBe(recordsBefore);
  });

  it('AC-0005-06 accepts a name that another tenant uses', async () => {
    const theirs = await defaultServiceTemplate(ctx, bia);
    await seedService(ctx.pool, {
      tenantId: bia.tenantId,
      formId: theirs.id,
      name: 'Sessão individual',
    });
    const template = await servico();

    await asAna()
      .create(serviceBody(template, { name: 'Sessão individual' }))
      .expect(201);
  });

  it('AC-0005-64 lets exactly one of two simultaneous creates with the same name win', async () => {
    const template = await servico();
    // listen once up front so neither in-flight request closes the shared server
    const server = ctx.app.getHttpServer();
    if (!server.listening) await new Promise<void>((r) => server.listen(0, r));
    const first = asAna().create(
      serviceBody(template, { name: 'Sessão individual' }),
    );
    const second = asAna().create(
      serviceBody(template, { name: 'Sessão individual' }),
    );

    // both requests are in flight before either response is awaited
    const responses = await Promise.all([first, second]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    const loser = responses.find((response) => response.status === 409)!;
    expect(loser.body).toEqual({ error: 'serviceName.taken', field: 'name' });
    expect(await countServices(ctx.pool, ana.tenantId)).toBe(1);
    // the rejected create leaves no orphan record
    expect(await countRecords(ctx.pool, ana.tenantId)).toBe(1);
  });

  it('AC-0005-65 rejects an update to a name another service holds and keeps the name', async () => {
    const template = await servico();
    await createServiceVia(ctx, ana, template, { name: 'Avaliação' });
    const retorno = await createServiceVia(ctx, ana, template, {
      name: 'Retorno',
    });

    const response = await asAna()
      .update(retorno.id, serviceUpdateBody(retorno, { name: 'avaliacao' }))
      .expect(409);

    expect(response.body).toEqual({
      error: 'serviceName.taken',
      field: 'name',
    });
    expect((await readService(ctx, ana, retorno.id)).name).toBe('Retorno');
  });
});

describe('update', () => {
  it('AC-0005-28 updates name, duration and price and reads back the same values', async () => {
    const template = await servico();
    const created = await createServiceVia(ctx, ana, template, {
      name: 'Sessão individual',
      durationMinutes: 90,
      priceCents: 15000,
    });

    const response = await asAna()
      .update(
        created.id,
        serviceUpdateBody(created, {
          name: 'Sessão dupla',
          durationMinutes: 120,
          priceCents: 25000,
          currency: 'BRL',
        }),
      )
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Sessão dupla',
      durationMinutes: 120,
      priceCents: 25000,
    });
    expect(await readService(ctx, ana, created.id)).toMatchObject({
      name: 'Sessão dupla',
      durationMinutes: 120,
      priceCents: 25000,
    });
  });
});

describe('read', () => {
  it('AC-0005-45 answers 404 service.not-found to a malformed service id', async () => {
    const response = await asAna().read('abc').expect(404);

    expect(response.body).toEqual({ error: 'service.not-found' });
  });
});

describe('tenant isolation and authentication', () => {
  it("AC-0005-16 answers 404 service.not-found to read, update, inactivate, reactivate and delete of another tenant's service and leaves it unchanged", async () => {
    const { id } = await seedService(ctx.pool, {
      tenantId: bia.tenantId,
      formId: (await defaultServiceTemplate(ctx, bia)).id,
      name: 'Pilates',
    });
    const before = await serviceRow(ctx.pool, id);

    const responses = [
      await asAna().read(id).expect(404),
      await asAna().update(id, UPDATE_OF_SEEDED).expect(404),
      await asAna().inactivate(id).expect(404),
      await asAna().reactivate(id).expect(404),
      await asAna().remove(id, { confirmName: 'Pilates' }).expect(404),
    ];

    for (const response of responses) {
      expect(response.body).toEqual({ error: 'service.not-found' });
    }
    expect(await serviceRow(ctx.pool, id)).toEqual(before);
  });

  it('AC-0005-17 answers 401 to a list and a create without an access token', async () => {
    const template = await servico();
    const anonymous = servicesApi(ctx.app, { tenantId: ana.tenantId });

    await anonymous.list().expect(401);
    await anonymous.create(serviceBody(template)).expect(401);
    expect(await countServices(ctx.pool, ana.tenantId)).toBe(0);
  });

  it('AC-0005-37 answers 401 to read, update, inactivate, reactivate and delete without an access token', async () => {
    const { id } = await seedService(ctx.pool, {
      tenantId: ana.tenantId,
      formId: (await servico()).id,
      name: 'Sessão individual',
    });
    const anonymous = servicesApi(ctx.app, { tenantId: ana.tenantId });
    const before = await serviceRow(ctx.pool, id);

    await anonymous.read(id).expect(401);
    await anonymous.update(id, UPDATE_OF_SEEDED).expect(401);
    await anonymous.inactivate(id).expect(401);
    await anonymous.reactivate(id).expect(401);
    await anonymous
      .remove(id, { confirmName: 'Sessão individual' })
      .expect(401);

    expect(await serviceRow(ctx.pool, id)).toEqual(before);
  });
});
