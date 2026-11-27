import request, { type Test } from 'supertest';
import type {
  ClientResponse,
  FieldInput,
  ServiceResponse,
} from '@planici/schemas';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import {
  dbFor,
  formRow,
  formsApi,
  inputsFrom,
  seedForm,
  signUpOwner,
  type Session,
} from '../utils/forms-fixtures.js';
import {
  clientRow,
  clientsApi,
  defaultTemplate,
  readClient,
  seedClient,
  updateBody,
  userIdOf,
} from '../utils/clients-fixtures.js';
import {
  defaultServiceTemplate,
  readService,
  seedService,
  serviceRow,
  servicesApi,
  serviceUpdateBody,
} from '../utils/services-fixtures.js';

// RN-02 tenant isolation of templates, clients and services.
//
// The isolation criteria in the resource specs use two users with one tenant
// each, so a query filtered by the caller's user id instead of the active
// tenant id still passes them. Here one user, Ana, is the owner of two
// tenants: "studio-ana" (A) and "studio-centro" (B). Only the active tenant
// tells A's rows from B's, so every 404 below proves a `tenant_id` filter.

let ctx: TestContext;
let ana: Session;
let anaInB: Session;
let a: SeededTenant;

type Api = {
  forms: ReturnType<typeof formsApi>;
  clients: ReturnType<typeof clientsApi>;
  services: ReturnType<typeof servicesApi>;
};

/**
 * One tenant's rows, each in the state where the mutation aimed at it would
 * succeed: an active and an archived template, an active and an inactive
 * client, an active and an inactive service.
 */
type SeededTenant = {
  form: string;
  /** The active template's fields as an unchanged preview or update sends them. */
  formFields: FieldInput[];
  archivedForm: string;
  /** The archived template's fields, for a preview of a change to it. */
  archivedFormFields: FieldInput[];
  client: ClientResponse;
  inactiveClient: string;
  service: ServiceResponse;
  inactiveService: string;
};

const as = (session: Session): Api => ({
  forms: formsApi(ctx.app, session),
  clients: clientsApi(ctx.app, session),
  services: servicesApi(ctx.app, session),
});

async function seedTenant(session: Session): Promise<SeededTenant> {
  const db = dbFor(ctx.pool);
  const cliente = await defaultTemplate(ctx, session);
  const servico = await defaultServiceTemplate(ctx, session);

  const form = await seedForm(db, {
    tenantId: session.tenantId,
    name: 'Ficha',
  });
  const archivedForm = await seedForm(db, {
    tenantId: session.tenantId,
    name: 'Antiga',
    status: 'archived',
  });
  const client = await seedClient(ctx.pool, {
    tenantId: session.tenantId,
    userId: userIdOf(session),
    formId: cliente.id,
    name: 'Ana Souza',
    email: 'ana@example.com',
  });
  const inactiveClient = await seedClient(ctx.pool, {
    tenantId: session.tenantId,
    userId: userIdOf(session),
    formId: cliente.id,
    name: 'Bruno Lima',
    email: 'bruno@example.com',
    status: 'inactive',
  });
  const service = await seedService(ctx.pool, {
    tenantId: session.tenantId,
    formId: servico.id,
    name: 'Pilates',
  });
  const inactiveService = await seedService(ctx.pool, {
    tenantId: session.tenantId,
    formId: servico.id,
    name: 'Yoga',
    status: 'inactive',
  });

  const formRead = await formsApi(ctx.app, session).read(form.id).expect(200);
  const archivedFormRead = await formsApi(ctx.app, session)
    .read(archivedForm.id)
    .expect(200);

  return {
    form: form.id,
    formFields: inputsFrom(formRead.body.fields),
    archivedForm: archivedForm.id,
    archivedFormFields: inputsFrom(archivedFormRead.body.fields),
    // read as the tenant's own member: the ids work with the right tenant
    client: await readClient(ctx, session, client.id),
    inactiveClient: inactiveClient.id,
    service: await readService(ctx, session, service.id),
    inactiveService: inactiveService.id,
  };
}

/** Every stored row of a seeded tenant, to compare before and after a refused call. */
async function snapshot(seeded: SeededTenant) {
  return {
    form: await formRow(ctx.pool, seeded.form),
    archivedForm: await formRow(ctx.pool, seeded.archivedForm),
    client: await clientRow(ctx.pool, seeded.client.id),
    inactiveClient: await clientRow(ctx.pool, seeded.inactiveClient),
    service: await serviceRow(ctx.pool, seeded.service.id),
    inactiveService: await serviceRow(ctx.pool, seeded.inactiveService),
  };
}

async function idsWhere(sql: string, tenantId: string): Promise<string[]> {
  const { rows } = await ctx.pool.query(sql, [tenantId]);
  return rows.map((row: { id: string }) => row.id);
}

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  const second = await request(ctx.app.getHttpServer())
    .post('/v1/tenants')
    .set('Authorization', `Bearer ${ana.token}`)
    .send({ name: 'Studio Centro', slug: 'studio-centro' })
    .expect(201);
  anaInB = { token: ana.token, tenantId: second.body.id as string };
  a = await seedTenant(ana);
});

afterAll(async () => {
  await ctx?.close();
});

type Call = {
  ac: string;
  route: string;
  error: string;
  call: (api: Api) => Test;
  /**
   * A read of the call's target that answers 200 with tenant A active, so the
   * 404 with tenant B active comes from the active tenant, not from a target
   * the API cannot find at all. Defaults to the call itself (for reads).
   */
  probe?: (api: Api) => Test;
};

const READS: Call[] = [
  {
    ac: 'AC-0001-15',
    route: 'GET /v1/forms/:id',
    error: 'form.not-found',
    call: (api) => api.forms.read(a.form),
  },
  {
    ac: 'RN-02',
    route: 'GET /v1/forms/:id/versions/1 (active template)',
    error: 'form.not-found',
    call: (api) => api.forms.version(a.form, 1),
  },
  {
    ac: 'RN-02',
    route: 'POST /v1/forms/:id/preview (active template)',
    error: 'form.not-found',
    call: (api) =>
      api.forms.preview(a.form, { revision: 1, fields: a.formFields }),
  },
  {
    ac: 'AC-0001-40',
    route: 'GET /v1/forms/:id/versions/1 (archived template)',
    error: 'form.not-found',
    call: (api) => api.forms.version(a.archivedForm, 1),
  },
  {
    ac: 'AC-0001-40',
    route: 'POST /v1/forms/:id/preview (archived template)',
    error: 'form.not-found',
    call: (api) =>
      api.forms.preview(a.archivedForm, {
        revision: 1,
        fields: a.archivedFormFields,
      }),
  },
  {
    ac: 'AC-0003-22',
    route: 'GET /v1/clients/:id',
    error: 'client.not-found',
    call: (api) => api.clients.read(a.client.id),
  },
  {
    ac: 'AC-0005-16',
    route: 'GET /v1/services/:id',
    error: 'service.not-found',
    call: (api) => api.services.read(a.service.id),
  },
];

const MUTATIONS: Call[] = [
  {
    ac: 'AC-0001-15',
    route: 'PATCH /v1/forms/:id',
    error: 'form.not-found',
    call: (api) => api.forms.update(a.form, { revision: 1, name: 'Hijacked' }),
    probe: (api) => api.forms.read(a.form),
  },
  {
    ac: 'AC-0001-15',
    route: 'POST /v1/forms/:id/archive',
    error: 'form.not-found',
    call: (api) => api.forms.archive(a.form),
    probe: (api) => api.forms.read(a.form),
  },
  {
    ac: 'AC-0001-40',
    route: 'POST /v1/forms/:id/unarchive',
    error: 'form.not-found',
    call: (api) => api.forms.unarchive(a.archivedForm),
    probe: (api) => api.forms.read(a.archivedForm),
  },
  {
    ac: 'AC-0001-15',
    route: 'POST /v1/forms/:id/delete',
    error: 'form.not-found',
    call: (api) => api.forms.remove(a.form, { confirmName: 'Ficha' }),
    probe: (api) => api.forms.read(a.form),
  },
  {
    ac: 'AC-0003-63',
    route: 'PATCH /v1/clients/:id',
    error: 'client.not-found',
    call: (api) =>
      api.clients.update(
        a.client.id,
        updateBody(a.client, { name: 'Hijacked' }),
      ),
    probe: (api) => api.clients.read(a.client.id),
  },
  {
    ac: 'AC-0004-16',
    route: 'POST /v1/clients/:id/inactivate',
    error: 'client.not-found',
    call: (api) => api.clients.inactivate(a.client.id),
    probe: (api) => api.clients.read(a.client.id),
  },
  {
    ac: 'AC-0004-16',
    route: 'POST /v1/clients/:id/reactivate',
    error: 'client.not-found',
    call: (api) => api.clients.reactivate(a.inactiveClient),
    probe: (api) => api.clients.read(a.inactiveClient),
  },
  {
    ac: 'AC-0004-16',
    route: 'POST /v1/clients/:id/delete',
    error: 'client.not-found',
    call: (api) =>
      api.clients.remove(a.client.id, { confirmName: 'Ana Souza' }),
    probe: (api) => api.clients.read(a.client.id),
  },
  {
    ac: 'AC-0005-16',
    route: 'PATCH /v1/services/:id',
    error: 'service.not-found',
    call: (api) =>
      api.services.update(
        a.service.id,
        serviceUpdateBody(a.service, { name: 'Hijacked' }),
      ),
    probe: (api) => api.services.read(a.service.id),
  },
  {
    ac: 'AC-0005-16',
    route: 'POST /v1/services/:id/inactivate',
    error: 'service.not-found',
    call: (api) => api.services.inactivate(a.service.id),
    probe: (api) => api.services.read(a.service.id),
  },
  {
    ac: 'AC-0005-16',
    route: 'POST /v1/services/:id/reactivate',
    error: 'service.not-found',
    call: (api) => api.services.reactivate(a.inactiveService),
    probe: (api) => api.services.read(a.inactiveService),
  },
  {
    ac: 'AC-0005-16',
    route: 'POST /v1/services/:id/delete',
    error: 'service.not-found',
    call: (api) =>
      api.services.remove(a.service.id, { confirmName: 'Pilates' }),
    probe: (api) => api.services.read(a.service.id),
  },
];

describe('one user who is a member of two tenants (RN-02)', () => {
  // each case first reaches its target with tenant A active (200), so its 404
  // with tenant B active comes from the active tenant, not from a bad id
  for (const { ac, route, error, call, probe = call } of READS) {
    it(`${ac} answers 404 ${error} to ${route} on tenant A's id with tenant B active`, async () => {
      await probe(as(ana)).expect(200);

      const response = await call(as(anaInB)).expect(404);

      expect(response.body).toEqual({ error });
    });
  }

  for (const { ac, route, error, call, probe } of MUTATIONS) {
    it(`${ac} answers 404 ${error} to ${route} on tenant A's id with tenant B active and leaves tenant A unchanged`, async () => {
      if (!probe) throw new Error(`${route} needs a probe read of its target`);
      await probe(as(ana)).expect(200);
      const before = await snapshot(a);

      const response = await call(as(anaInB)).expect(404);

      expect(response.body).toEqual({ error });
      expect(await snapshot(a)).toEqual(before);
    });
  }

  // the list holds tenant B's own rows (B gets its own seed) and none of A's
  const LISTS = [
    {
      ac: 'AC-0001-41',
      route: 'GET /v1/forms?includeArchived=true',
      call: (api: Api) => api.forms.list({ includeArchived: 'true' }),
      listed: (body: { forms: { id: string }[] }) => body.forms,
      stored: 'select id from forms where tenant_id = $1',
    },
    {
      ac: 'AC-0004-34',
      route: 'GET /v1/clients?status=all',
      call: (api: Api) => api.clients.list({ status: 'all' }),
      listed: (body: { clients: { id: string }[] }) => body.clients,
      stored: 'select id from clients where tenant_id = $1',
    },
    {
      ac: 'AC-0005-33',
      route: 'GET /v1/services?status=all',
      call: (api: Api) => api.services.list({ status: 'all' }),
      listed: (body: { services: { id: string }[] }) => body.services,
      stored: 'select id from services where tenant_id = $1',
    },
    {
      ac: 'AC-0005-110',
      route: 'GET /v1/services/templates',
      call: (api: Api) => api.services.templates(),
      listed: (body: { templates: { id: string }[] }) => body.templates,
      stored: "select id from forms where tenant_id = $1 and type = 'service'",
    },
  ];

  for (const { ac, route, call, listed, stored } of LISTS) {
    it(`${ac} lists none of tenant A's rows on ${route} with tenant B active`, async () => {
      await seedTenant(anaInB);
      const ownedByA = await idsWhere(stored, ana.tenantId);
      const ownedByB = await idsWhere(stored, anaInB.tenantId);

      const response = await call(as(anaInB)).expect(200);
      const ids = listed(response.body).map((row) => row.id);

      expect(ids.length).toBeGreaterThan(0);
      expect(ownedByB).toEqual(expect.arrayContaining(ids));
      expect(ids.filter((id) => ownedByA.includes(id))).toEqual([]);
    });
  }
});

// api-convention.md, Tenant context: no active membership or a deleted tenant
// is 404 tenant.not-found, an inactive (suspended) tenant is 403
// tenant.inactive (AC-0001-43 for lists). Checked here on per-id routes.
describe('membership and tenant state through ActiveTenantGuard', () => {
  const GUARDED: { route: string; call: (api: Api) => Test }[] = [
    { route: 'GET /v1/forms/:id', call: (api) => api.forms.read(a.form) },
    {
      route: 'POST /v1/forms/:id/archive',
      call: (api) => api.forms.archive(a.form),
    },
    {
      route: 'GET /v1/clients/:id',
      call: (api) => api.clients.read(a.client.id),
    },
    {
      route: 'POST /v1/clients/:id/inactivate',
      call: (api) => api.clients.inactivate(a.client.id),
    },
    {
      route: 'GET /v1/services/:id',
      call: (api) => api.services.read(a.service.id),
    },
    {
      route: 'POST /v1/services/:id/inactivate',
      call: (api) => api.services.inactivate(a.service.id),
    },
  ];

  // record_status: active, suspended, deleted (tenants and tenant_memberships)
  async function setStatus(
    of: 'membership' | 'tenant',
    status: 'suspended' | 'deleted',
  ) {
    const { rowCount } =
      of === 'tenant'
        ? await ctx.pool.query('update tenants set status = $2 where id = $1', [
            ana.tenantId,
            status,
          ])
        : await ctx.pool.query(
            'update tenant_memberships set status = $3 where tenant_id = $1 and user_id = $2',
            [ana.tenantId, userIdOf(ana), status],
          );
    expect(rowCount).toBe(1);
  }

  const STATES = [
    {
      state: 'membership suspended',
      of: 'membership',
      to: 'suspended',
      status: 404,
      error: 'tenant.not-found',
    },
    {
      state: 'membership deleted',
      of: 'membership',
      to: 'deleted',
      status: 404,
      error: 'tenant.not-found',
    },
    {
      state: 'tenant deleted',
      of: 'tenant',
      to: 'deleted',
      status: 404,
      error: 'tenant.not-found',
    },
    {
      state: 'tenant suspended',
      of: 'tenant',
      to: 'suspended',
      status: 403,
      error: 'tenant.inactive',
    },
  ] as const;

  for (const { state, of, to, status, error } of STATES) {
    it(`answers ${status} ${error} to per-id reads and mutations with the ${state} and leaves the rows unchanged`, async () => {
      await setStatus(of, to);
      const before = await snapshot(a);

      for (const { route, call } of GUARDED) {
        const response = await call(as(ana));
        expect({ route, status: response.status, body: response.body }).toEqual(
          { route, status, body: { error } },
        );
      }
      expect(await snapshot(a)).toEqual(before);
    });
  }
});

// AC-0001-42 and AC-0004-35 check a tenant header without membership on create
// and list; the same rule on per-id routes, with that tenant's own ids.
describe('a tenant header the caller has no membership in', () => {
  let bia: Session;
  let b: SeededTenant;

  beforeEach(async () => {
    bia = await signUpOwner(ctx, 'studio-bia');
    b = await seedTenant(bia);
  });

  it("answers 404 tenant.not-found to per-id reads and mutations of that tenant's rows and leaves them unchanged", async () => {
    const intruder = as({ token: ana.token, tenantId: bia.tenantId });
    const before = await snapshot(b);

    // built one at a time: supertest closes its ephemeral listener after each request
    const calls: [string, () => Test][] = [
      ['GET /v1/forms/:id', () => intruder.forms.read(b.form)],
      [
        'PATCH /v1/forms/:id',
        () => intruder.forms.update(b.form, { revision: 1, name: 'Hijacked' }),
      ],
      ['GET /v1/clients/:id', () => intruder.clients.read(b.client.id)],
      [
        'PATCH /v1/clients/:id',
        () =>
          intruder.clients.update(
            b.client.id,
            updateBody(b.client, { name: 'Hijacked' }),
          ),
      ],
      ['GET /v1/services/:id', () => intruder.services.read(b.service.id)],
      [
        'PATCH /v1/services/:id',
        () =>
          intruder.services.update(
            b.service.id,
            serviceUpdateBody(b.service, { name: 'Hijacked' }),
          ),
      ],
    ];

    for (const [route, call] of calls) {
      const response = await call();
      expect({ route, status: response.status, body: response.body }).toEqual({
        route,
        status: 404,
        body: { error: 'tenant.not-found' },
      });
    }
    expect(await snapshot(b)).toEqual(before);
  });
});
