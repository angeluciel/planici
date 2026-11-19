import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClientSummary } from '@planici/schemas';
import { createTestApp, type TestContext } from '../setup/test-app.js';
import { signUpOwner, type Session } from '../utils/forms-fixtures.js';
import {
  createTemplate,
  type RecordTemplate,
} from '../utils/records-fixtures.js';
import {
  clientsApi,
  seedClient,
  seedClients,
  userIdOf,
  type SeedClientInput,
} from '../utils/clients-fixtures.js';

// E-list: list, search, status filter, pagination, tenant context
// (SPEC-0004 plan, Tests)

let ctx: TestContext;
let ana: Session;
let bia: Session;
let ficha: RecordTemplate;

const asAna = () => clientsApi(ctx.app, ana);

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
  ana = await signUpOwner(ctx, 'studio-ana');
  bia = await signUpOwner(ctx, 'studio-bia');
  ficha = await createTemplate(ctx, ana, 'client', 'Ficha');
});

afterAll(async () => {
  await ctx?.close();
});

type Seed = Pick<SeedClientInput, 'name' | 'email' | 'phone' | 'status'>;

const seed = (input: Seed, session = ana, template = ficha) =>
  seedClient(ctx.pool, {
    tenantId: session.tenantId,
    userId: userIdOf(session),
    formId: template.id,
    ...input,
  });

const namesOf = (body: { clients: ClientSummary[] }) =>
  body.clients.map((client) => client.name);

describe('search', () => {
  it('AC-0004-10 finds "Ana Souza" by name and "Bruno Lima" by the e-mail domain', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Bruno Lima', email: 'bruno@studio.com' });

    const byName = await asAna().list({ q: 'SOUZA' }).expect(200);
    const byEmail = await asAna().list({ q: 'studio' }).expect(200);

    expect(namesOf(byName.body)).toEqual(['Ana Souza']);
    expect(namesOf(byEmail.body)).toEqual(['Bruno Lima']);
  });

  it('AC-0004-43 finds "Érica Gonçalves" by "goncalves", ignoring accents', async () => {
    await seed({ name: 'Érica Gonçalves', email: 'erica@example.com' });

    const response = await asAna().list({ q: 'goncalves' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Érica Gonçalves']);
  });

  it('AC-0004-50 finds a client by 5 digits of the phone', async () => {
    await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      phone: '11987654321',
    });

    const response = await asAna().list({ q: '98765' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Souza']);
  });

  it('AC-0004-51 does not match the phone with fewer than 4 digits', async () => {
    await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      phone: '11987654321',
    });

    const response = await asAna().list({ q: '987' }).expect(200);

    expect(response.body.clients).toEqual([]);
  });

  it('AC-0004-52 treats a blank query as no filter', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });

    const response = await asAna().list({ q: '   ' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('AC-0004-40 rejects a query of 1 character with clientSearch.min', async () => {
    const response = await asAna().list({ q: 'a' }).expect(422);

    expect(response.body).toEqual({ error: 'clientSearch.min', field: 'q' });
  });

  it('AC-0004-44 applies the search under the inactive and all filters', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({
      name: 'Ana Lima',
      email: 'lima@example.com',
      status: 'inactive',
    });

    const inactive = await asAna()
      .list({ q: 'ana', status: 'inactive' })
      .expect(200);
    const all = await asAna().list({ q: 'ana', status: 'all' }).expect(200);

    expect(namesOf(inactive.body)).toEqual(['Ana Lima']);
    expect(namesOf(all.body)).toEqual(['Ana Lima', 'Ana Souza']);
  });
});

describe('order, status and summary', () => {
  it('AC-0004-11 lists "Ana", "bruno", "Érica" ignoring case and accents', async () => {
    await seed({ name: 'Érica', email: 'erica@example.com' });
    await seed({ name: 'bruno', email: 'bruno@example.com' });
    await seed({ name: 'Ana', email: 'ana@example.com' });

    const response = await asAna().list().expect(200);

    expect(namesOf(response.body)).toEqual(['Ana', 'bruno', 'Érica']);
  });

  it('AC-0004-72 rejects the status "deleted" with clientStatus.invalid', async () => {
    const response = await asAna().list({ status: 'deleted' }).expect(422);

    expect(response.body).toEqual({
      error: 'clientStatus.invalid',
      field: 'status',
    });
  });
});

describe('pagination', () => {
  it('AC-0004-21 pages 120 clients as 50, 50 and 20 in name order without repeats or gaps', async () => {
    await seedClients(
      ctx.pool,
      { tenantId: ana.tenantId, userId: userIdOf(ana), formId: ficha.id },
      120,
    );

    const first = await asAna().list().expect(200);
    const second = await asAna()
      .list({ after: first.body.nextCursor })
      .expect(200);
    const third = await asAna()
      .list({ after: second.body.nextCursor })
      .expect(200);

    expect(
      [first, second, third].map((page) => page.body.clients.length),
    ).toEqual([50, 50, 20]);
    expect(typeof first.body.nextCursor).toBe('string');
    expect(typeof second.body.nextCursor).toBe('string');
    expect(third.body.nextCursor).toBeNull();
    const names = [first, second, third].flatMap((page) => namesOf(page.body));
    const expected = Array.from(
      { length: 120 },
      (_, index) => `Cliente ${String(index + 1).padStart(3, '0')}`,
    );
    expect(names).toEqual(expected);
  });

  it('AC-0004-22 rejects a limit of 101 with limit.invalid', async () => {
    const response = await asAna().list({ limit: '101' }).expect(422);

    expect(response.body).toEqual({ error: 'limit.invalid', field: 'limit' });
  });

  it('AC-0004-23 rejects a cursor issued for another search with cursor.invalid', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Ana Lima', email: 'lima@example.com' });
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });
    const page = await asAna().list({ q: 'ana', limit: '1' }).expect(200);
    expect(typeof page.body.nextCursor).toBe('string');

    const response = await asAna()
      .list({ q: 'bruno', after: page.body.nextCursor })
      .expect(422);

    expect(response.body).toEqual({ error: 'cursor.invalid', field: 'after' });
  });
});

describe('tenant isolation and context', () => {
  it("AC-0004-34 never lists or finds another tenant's clients", async () => {
    const theirs = await createTemplate(ctx, bia, 'client', 'Ficha');
    await seed({ name: 'Bia Lima', email: 'bia@example.com' }, bia, theirs);
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });

    const all = await asAna().list({ status: 'all' }).expect(200);
    const search = await asAna().list({ q: 'Lima' }).expect(200);

    expect(namesOf(all.body)).toEqual(['Ana Souza']);
    expect(search.body.clients).toEqual([]);
  });

  it('AC-0004-35 answers 404 tenant.not-found for a tenant the user does not belong to', async () => {
    const response = await clientsApi(ctx.app, {
      token: ana.token,
      tenantId: bia.tenantId,
    })
      .list()
      .expect(404);

    expect(response.body).toEqual({ error: 'tenant.not-found' });
  });

  it('AC-0004-60 answers 403 tenant.inactive for a suspended tenant', async () => {
    await ctx.pool.query(
      "update tenants set status = 'suspended' where id = $1",
      [ana.tenantId],
    );

    const response = await asAna().list().expect(403);

    expect(response.body).toEqual({ error: 'tenant.inactive' });
  });

  it('AC-0004-61 answers 400 tenant.required without a tenant context', async () => {
    const response = await clientsApi(ctx.app, { token: ana.token })
      .list()
      .expect(400);

    expect(response.body).toEqual({ error: 'tenant.required' });
  });
});
