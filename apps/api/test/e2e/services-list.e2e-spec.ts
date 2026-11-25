import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ServiceSummary } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  formsApi,
  signUpOwner,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  createTemplate,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import { defaultTemplate } from '../utils/clients-fixtures.js';
import {
  defaultServiceTemplate,
  FakeServiceHistory,
  readService,
  seedService,
  seedServices,
  servicesApi,
  serviceUpdateBody,
  type SeedServiceInput,
} from '../utils/services-fixtures.js';

// E-slist: list, search, filters, sorts, total, pagination, tenant context,
// template summary (SPEC-0005 plan, Tests)

let ctx: TestContext;
let historyCtx: TestContext;
let history: FakeServiceHistory;
let ana: Session;
let bia: Session;
let servico: RecordTemplate;

const asAna = () => servicesApi(ctx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
  history = new FakeServiceHistory();
  // depends on the `serviceHistory` option the implementer adds to createTestApp
  historyCtx = await createTestApp({ serviceHistory: history });
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
  servico = await defaultServiceTemplate(ctx, ana);
});

afterAll(async () => {
  await ctx?.close();
  await historyCtx?.close();
});

type Seed = Pick<
  SeedServiceInput,
  'name' | 'durationMinutes' | 'priceCents' | 'status' | 'updatedAt'
>;

const seed = (input: Seed, session = ana, template = servico) =>
  seedService(ctx.pool, {
    tenantId: session.tenantId,
    formId: template.id,
    ...input,
  });

const namesOf = (body: { services: ServiceSummary[] }) =>
  body.services.map((service) => service.name);

describe('order and search', () => {
  it('AC-0005-12 lists "Avaliação", "sessão" and "Retorno" as "Avaliação", "Retorno", "sessão"', async () => {
    await seed({ name: 'Avaliação' });
    await seed({ name: 'sessão' });
    await seed({ name: 'Retorno' });

    const response = await asAna().list().expect(200);

    expect(namesOf(response.body)).toEqual(['Avaliação', 'Retorno', 'sessão']);
  });

  it('AC-0005-21 finds only "sessão" when searching "SESSAO"', async () => {
    await seed({ name: 'Avaliação' });
    await seed({ name: 'sessão' });
    await seed({ name: 'Retorno' });

    const response = await asAna().list({ q: 'SESSAO' }).expect(200);

    expect(namesOf(response.body)).toEqual(['sessão']);
  });

  it('AC-0005-41 treats a blank query as no filter', async () => {
    await seed({ name: 'Avaliação' });
    await seed({ name: 'Retorno' });

    const response = await asAna().list({ q: '   ' }).expect(200);

    expect(response.status).toBe(200);
    expect(namesOf(response.body)).toEqual(['Avaliação', 'Retorno']);
  });

  it('AC-0005-40 rejects a query of 1 character with serviceSearch.min', async () => {
    const response = await asAna().list({ q: 'a' }).expect(422);

    expect(response.body).toEqual({ error: 'serviceSearch.min', field: 'q' });
  });

  it('AC-0005-71 lists "sessão", "Retorno", "Avaliação" under sort -name', async () => {
    await seed({ name: 'Avaliação' });
    await seed({ name: 'sessão' });
    await seed({ name: 'Retorno' });

    const response = await asAna().list({ sort: '-name' }).expect(200);

    expect(namesOf(response.body)).toEqual(['sessão', 'Retorno', 'Avaliação']);
  });

  it('AC-0005-72 lists the edited service first under sort -updatedAt', async () => {
    const avaliacao = await seed({
      name: 'Avaliação',
      updatedAt: '2020-01-01T10:00:00Z',
    });
    await seed({ name: 'Retorno', updatedAt: '2020-01-02T10:00:00Z' });
    const before = await readService(ctx, ana, avaliacao.id);
    const unedited = await asAna().list({ sort: '-updatedAt' }).expect(200);
    expect(namesOf(unedited.body)).toEqual(['Retorno', 'Avaliação']);

    await asAna()
      .update(avaliacao.id, serviceUpdateBody(before, { priceCents: 20000 }))
      .expect(200);
    const response = await asAna().list({ sort: '-updatedAt' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Avaliação', 'Retorno']);
  });

  it('AC-0005-73 rejects sort "price" with serviceSort.invalid', async () => {
    const response = await asAna().list({ sort: 'price' }).expect(422);

    expect(response.body).toEqual({
      error: 'serviceSort.invalid',
      field: 'sort',
    });
  });

  it('AC-0005-44 rejects the status "deleted" with serviceStatus.invalid', async () => {
    const response = await asAna().list({ status: 'deleted' }).expect(422);

    expect(response.body).toEqual({
      error: 'serviceStatus.invalid',
      field: 'status',
    });
  });
});

describe('pagination and total', () => {
  it('AC-0005-19 pages 60 services as 25, 25 and 10 in name order, with nextCursor null on the last', async () => {
    await seedServices(
      ctx.pool,
      { tenantId: ana.tenantId, formId: servico.id },
      60,
    );

    const first = await asAna().list({ limit: '25' }).expect(200);
    const second = await asAna()
      .list({ limit: '25', after: first.body.nextCursor })
      .expect(200);
    const third = await asAna()
      .list({ limit: '25', after: second.body.nextCursor })
      .expect(200);

    expect(
      [first, second, third].map((page) => page.body.services.length),
    ).toEqual([25, 25, 10]);
    expect(typeof first.body.nextCursor).toBe('string');
    expect(typeof second.body.nextCursor).toBe('string');
    expect(third.body.nextCursor).toBeNull();
    const expected = Array.from(
      { length: 60 },
      (_, index) => `Serviço ${String(index + 1).padStart(3, '0')}`,
    );
    expect(
      [first, second, third].flatMap((page) => namesOf(page.body)),
    ).toEqual(expected);
  });

  it('AC-0005-70 reports 25 services and total 60 for limit 25', async () => {
    await seedServices(
      ctx.pool,
      { tenantId: ana.tenantId, formId: servico.id },
      60,
    );

    const response = await asAna().list({ limit: '25' }).expect(200);

    expect(response.body.services).toHaveLength(25);
    expect(response.body.total).toBe(60);
  });

  it('AC-0005-42 rejects a limit of 101 with limit.invalid', async () => {
    const response = await asAna().list({ limit: '101' }).expect(422);

    expect(response.body).toEqual({ error: 'limit.invalid', field: 'limit' });
  });

  it('AC-0005-43 rejects a cursor issued for another search with cursor.invalid', async () => {
    await seed({ name: 'Avaliação 1' });
    await seed({ name: 'Avaliação 2' });
    await seed({ name: 'Retorno' });
    const page = await asAna().list({ q: 'ava', limit: '1' }).expect(200);
    expect(typeof page.body.nextCursor).toBe('string');

    const response = await asAna()
      .list({ q: 'ret', after: page.body.nextCursor })
      .expect(422);

    expect(response.body).toEqual({ error: 'cursor.invalid', field: 'after' });
  });
});

describe('template filter', () => {
  it('AC-0005-68 lists only the services of the filtered template, with total 1', async () => {
    const sessao = await createTemplate(ctx, ana, 'service', 'Sessão');
    await seed({ name: 'Avaliação' });
    await seed({ name: 'Pilates solo' }, ana, sessao);

    const response = await asAna().list({ formId: sessao.id }).expect(200);

    expect(namesOf(response.body)).toEqual(['Pilates solo']);
    expect(response.body.total).toBe(1);
  });

  it('AC-0005-69 answers 200 with no services and total 0 for a client template as filter', async () => {
    await seed({ name: 'Avaliação' });
    const cliente = await defaultTemplate(ctx, ana);

    const response = await asAna().list({ formId: cliente.id }).expect(200);

    expect(response.body.services).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  it("AC-0005-82 answers 200 with no services and total 0 for another tenant's template as filter", async () => {
    const pilates = await createTemplate(ctx, bia, 'service', 'Pilates');
    await seed({ name: 'Pilates solo' }, bia, pilates);
    await seed({ name: 'Avaliação' });

    const response = await asAna().list({ formId: pilates.id }).expect(200);

    expect(response.body.services).toEqual([]);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.total).toBe(0);
  });

  it('AC-0005-82 answers 200 with no services and total 0 for an unknown template id', async () => {
    await seed({ name: 'Avaliação' });

    const response = await asAna().list({ formId: randomUUID() }).expect(200);

    expect(response.body.services).toEqual([]);
    expect(response.body.total).toBe(0);
  });
});

describe('sort by template', () => {
  it('AC-0005-108 lists "Peeling", "Botox", "Facial" under sort form, and keeps the order across pages', async () => {
    const dermatologia = await createTemplate(
      ctx,
      ana,
      'service',
      'Dermatologia',
    );
    const esteticos = await createTemplate(ctx, ana, 'service', 'Estéticos');
    await seed({ name: 'Peeling' }, ana, dermatologia);
    await seed({ name: 'Facial' }, ana, esteticos);
    await seed({ name: 'Botox' }, ana, esteticos);

    const whole = await asAna().list({ sort: 'form' }).expect(200);
    const first = await asAna().list({ sort: 'form', limit: '1' }).expect(200);
    const second = await asAna()
      .list({ sort: 'form', limit: '1', after: first.body.nextCursor })
      .expect(200);
    const third = await asAna()
      .list({ sort: 'form', limit: '1', after: second.body.nextCursor })
      .expect(200);

    expect(namesOf(whole.body)).toEqual(['Peeling', 'Botox', 'Facial']);
    expect(
      [first, second, third].flatMap((page) => namesOf(page.body)),
    ).toEqual(['Peeling', 'Botox', 'Facial']);
    expect(third.body.nextCursor).toBeNull();
  });
});

describe('hasHistory', () => {
  // partly (G-3, G-9): the history is a fake ServiceHistoryReader, no appointment exists
  it('AC-0005-111 partly: lists hasHistory true for a service with history and false for one without', async () => {
    const peeling = await seed({ name: 'Peeling' });
    await seed({ name: 'Facial' });
    history.setHistory(peeling.id);

    const response = await servicesApi(historyCtx.app, ana).list().expect(200);

    const flags = Object.fromEntries(
      (response.body.services as ServiceSummary[]).map((service) => [
        service.name,
        service.hasHistory,
      ]),
    );
    expect(flags).toEqual({ Peeling: true, Facial: false });
  });
});

describe('tenant isolation and context', () => {
  it("AC-0005-33 never lists or finds another tenant's services", async () => {
    const pilatesTemplate = await defaultServiceTemplate(ctx, bia);
    await seed({ name: 'Pilates' }, bia, pilatesTemplate);
    await seed({ name: 'Sessão individual' });

    const all = await asAna().list({ status: 'all' }).expect(200);
    const search = await asAna().list({ q: 'Pilates' }).expect(200);

    expect(namesOf(all.body)).toEqual(['Sessão individual']);
    expect(search.body.services).toEqual([]);
  });

  it('AC-0005-36 answers 404 tenant.not-found for a tenant the user does not belong to', async () => {
    const response = await servicesApi(ctx.app, {
      token: ana.token,
      tenantId: bia.tenantId,
    })
      .list()
      .expect(404);

    expect(response.body).toEqual({ error: 'tenant.not-found' });
  });

  it('AC-0005-38 answers 400 tenant.required without a tenant context', async () => {
    const response = await servicesApi(ctx.app, { token: ana.token })
      .list()
      .expect(400);

    expect(response.body).toEqual({ error: 'tenant.required' });
  });

  it('AC-0005-39 answers 403 tenant.inactive for a suspended tenant', async () => {
    await ctx.pool.query(
      "update tenants set status = 'suspended' where id = $1",
      [ana.tenantId],
    );

    const response = await asAna().list().expect(403);

    expect(response.body).toEqual({ error: 'tenant.inactive' });
  });
});

describe('template summary (GET /v1/services/templates)', () => {
  const summary = () => asAna().templates();

  // G-10: a route registered after GET /v1/services/:serviceId would answer
  // 404 service.not-found, "templates" being a malformed id
  it('AC-0005-109 answers 200, not 404, on the summary path, with no services yet', async () => {
    const response = await summary().expect(200);

    expect(response.body).toEqual({ templates: [], archivedCount: 0 });
  });

  it('AC-0005-109 lists only "Estéticos" with activeCount 2 and counts 2 archived services', async () => {
    const esteticos = await createTemplate(ctx, ana, 'service', 'Estéticos');
    const laser = await createTemplate(ctx, ana, 'service', 'Laser');
    await seed({ name: 'Facial' }, ana, esteticos);
    await seed({ name: 'Botox' }, ana, esteticos);
    await seed({ name: 'Peeling', status: 'inactive' }, ana, esteticos);
    await seed({ name: 'Laser antigo', status: 'inactive' }, ana, laser);

    const response = await summary().expect(200);

    expect(response.body).toEqual({
      templates: [
        {
          id: esteticos.id,
          name: 'Estéticos',
          status: 'active',
          activeCount: 2,
        },
      ],
      archivedCount: 2,
    });
  });

  it('AC-0005-116 reports status "active" for an active template and "archived" for an archived one', async () => {
    const esteticos = await createTemplate(ctx, ana, 'service', 'Estéticos');
    const laser = await createTemplate(ctx, ana, 'service', 'Laser');
    await seed({ name: 'Facial' }, ana, esteticos);
    await seed({ name: 'Laser facial' }, ana, laser);
    await formsApi(ctx.app, ana).archive(laser.id).expect(200);

    const response = await summary().expect(200);

    expect(
      response.body.templates.map(
        (template: { name: string; status: string }) => [
          template.name,
          template.status,
        ],
      ),
    ).toEqual([
      ['Estéticos', 'active'],
      ['Laser', 'archived'],
    ]);
  });

  it("AC-0005-110 leaves another tenant's template and archived services out of the summary", async () => {
    const pilates = await createTemplate(ctx, bia, 'service', 'Pilates');
    await seed({ name: 'Pilates solo' }, bia, pilates);
    await seed({ name: 'Pilates antigo', status: 'inactive' }, bia, pilates);
    await seed({ name: 'Avaliação' });

    const response = await summary().expect(200);

    expect(
      response.body.templates.map(
        (template: { name: string }) => template.name,
      ),
    ).toEqual(['Serviço']);
    expect(response.body.archivedCount).toBe(0);
  });

  it('AC-0005-110 answers 404 tenant.not-found for a tenant the user does not belong to', async () => {
    const response = await servicesApi(ctx.app, {
      token: ana.token,
      tenantId: bia.tenantId,
    })
      .templates()
      .expect(404);

    expect(response.body).toEqual({ error: 'tenant.not-found' });
  });

  it('AC-0005-110 answers 401 without an access token', async () => {
    await servicesApi(ctx.app, { tenantId: ana.tenantId })
      .templates()
      .expect(401);
  });
});
