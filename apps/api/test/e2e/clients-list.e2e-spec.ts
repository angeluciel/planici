import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClientSummary } from '@planici/schemas';
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
import {
  clientsApi,
  readClient,
  seedClient,
  seedClients,
  setUpdatedAt,
  updateBody,
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

type Seed = Pick<
  SeedClientInput,
  'name' | 'email' | 'phone' | 'status' | 'updatedAt'
>;

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

// ---------------------------------------------------------------------------
// SPEC-0006: template filter, total, sort (plan, Tests)

const idsOf = (body: { clients: ClientSummary[] }) =>
  body.clients.map((client) => client.id);

const seedMany = (names: string[], tag: string) =>
  Promise.all(
    names.map((name, index) =>
      // sequential order does not matter, each row is independent
      seed({ name, email: `${tag}${index}@example.com` }),
    ),
  );

describe('SPEC-0006 template filter', () => {
  let anamnese: RecordTemplate;

  beforeEach(async () => {
    anamnese = await createTemplate(ctx, ana, 'client', 'Anamnese');
  });

  it('AC-0006-01 filters by template and reports total 1', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' }, ana, anamnese);
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });

    const response = await asAna().list({ formId: anamnese.id }).expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Souza']);
    expect(response.body.total).toBe(1);
  });

  it("R3 count path: the template filter's total with limit 1", async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' }, ana, anamnese);
    await seed({ name: 'Ana Lima', email: 'lima@example.com' }, ana, anamnese);
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });
    const theirs = await createTemplate(ctx, bia, 'client', 'Anamnese');
    await seed({ name: 'Bia Lima', email: 'bia@example.com' }, bia, theirs);

    const response = await asAna()
      .list({ formId: anamnese.id, limit: '1' })
      .expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Lima']);
    expect(typeof response.body.nextCursor).toBe('string');
    expect(response.body.total).toBe(2);
  });

  it('AC-0006-02 combines the template filter with q and status', async () => {
    await seed(
      { name: 'Ana Souza', email: 'souza@example.com' },
      ana,
      anamnese,
    );
    await seed(
      { name: 'Ana Lima', email: 'lima@example.com', status: 'inactive' },
      ana,
      anamnese,
    );
    await seed({ name: 'Ana Reis', email: 'reis@example.com' });

    const response = await asAna()
      .list({ q: 'ana', status: 'all', formId: anamnese.id })
      .expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Lima', 'Ana Souza']);
    expect(response.body.total).toBe(2);
  });

  it('AC-0006-03 lists the clients of an archived template', async () => {
    const antigo = await createTemplate(ctx, ana, 'client', 'Antigo');
    await seed({ name: 'Carla Dias', email: 'carla@example.com' }, ana, antigo);
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });
    const archived = await formsApi(ctx.app, ana).archive(antigo.id);
    expect(archived.status).toBeLessThan(300);

    const response = await asAna().list({ formId: antigo.id }).expect(200);

    expect(namesOf(response.body)).toEqual(['Carla Dias']);
  });

  it("AC-0006-04 answers an empty list and total 0 for another tenant's template", async () => {
    const fichaBia = await createTemplate(ctx, bia, 'client', 'Ficha Bia');
    await seed({ name: 'Bia Lima', email: 'bia@example.com' }, bia, fichaBia);

    const response = await asAna().list({ formId: fichaBia.id }).expect(200);

    expect(response.body.clients).toEqual([]);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.total).toBe(0);
  });

  it('AC-0006-05 answers an empty list and total 0 for an unknown template id', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });

    const response = await asAna().list({ formId: randomUUID() }).expect(200);

    expect(response.body.clients).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  it('AC-0006-06 answers an empty list and total 0 for a service template', async () => {
    const corte = await createTemplate(ctx, ana, 'service', 'Corte');
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });

    const response = await asAna().list({ formId: corte.id }).expect(200);

    expect(response.body.clients).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  it('AC-0006-07 rejects a malformed formId with formId.invalid', async () => {
    const response = await asAna().list({ formId: 'not-an-id' }).expect(422);

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
  });

  it('AC-0006-34 rejects a cursor issued for another template filter', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' }, ana, anamnese);
    await seed({ name: 'Ana Lima', email: 'lima@example.com' }, ana, anamnese);
    const page = await asAna()
      .list({ formId: anamnese.id, limit: '1' })
      .expect(200);
    expect(typeof page.body.nextCursor).toBe('string');

    const other = await asAna()
      .list({ formId: ficha.id, after: page.body.nextCursor })
      .expect(422);
    const none = await asAna()
      .list({ after: page.body.nextCursor })
      .expect(422);

    expect(other.body).toEqual({ error: 'cursor.invalid', field: 'after' });
    expect(none.body).toEqual({ error: 'cursor.invalid', field: 'after' });
  });
});

describe('SPEC-0006 total', () => {
  it('AC-0006-16 reports total 120 on two pages of limit 10', async () => {
    await seedClients(
      ctx.pool,
      { tenantId: ana.tenantId, userId: userIdOf(ana), formId: ficha.id },
      120,
    );

    const first = await asAna().list({ limit: '10' }).expect(200);
    const second = await asAna()
      .list({ limit: '10', after: first.body.nextCursor })
      .expect(200);

    expect(first.body.clients).toHaveLength(10);
    expect(second.body.clients).toHaveLength(10);
    expect(first.body.total).toBe(120);
    expect(second.body.total).toBe(120);
  });

  it('AC-0006-17 total follows the search and the status filter', async () => {
    await seed({ name: 'Ana Souza', email: 'souza@example.com' });
    await seed({ name: 'Ana Lima', email: 'lima@example.com' });
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });
    await seed({
      name: 'Ana Reis',
      email: 'reis@example.com',
      status: 'inactive',
    });

    const response = await asAna().list({ q: 'ana' }).expect(200);

    expect(response.body.total).toBe(2);
  });

  it("AC-0006-18 total never counts another tenant's clients", async () => {
    const theirs = await createTemplate(ctx, bia, 'client', 'Ficha');
    for (const name of ['Bia Um', 'Bia Dois', 'Bia Tres']) {
      await seed(
        { name, email: `${name.replace(' ', '')}@example.com` },
        bia,
        theirs,
      );
    }
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Ana Lima', email: 'lima@example.com' });

    const response = await asAna().list({ status: 'all' }).expect(200);

    expect(response.body.total).toBe(2);
  });

  it("AC-0006-18 count path: limit 1 still counts only the tenant's clients", async () => {
    const theirs = await createTemplate(ctx, bia, 'client', 'Ficha');
    for (const name of ['Bia Um', 'Bia Dois', 'Bia Tres']) {
      await seed(
        { name, email: `${name.replace(' ', '')}@example.com` },
        bia,
        theirs,
      );
    }
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Ana Lima', email: 'lima@example.com' });

    const response = await asAna()
      .list({ status: 'all', limit: '1' })
      .expect(200);

    expect(response.body.clients).toHaveLength(1);
    expect(typeof response.body.nextCursor).toBe('string');
    expect(response.body.total).toBe(2);
  });
});

describe('SPEC-0006 sort', () => {
  it('AC-0006-22 sorts by name descending ignoring case and accents', async () => {
    await seed({ name: 'Érica', email: 'erica@example.com' });
    await seed({ name: 'bruno', email: 'bruno@example.com' });
    await seed({ name: 'Ana', email: 'ana@example.com' });

    const response = await asAna().list({ sort: '-name' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Érica', 'bruno', 'Ana']);
  });

  it('AC-0006-23 sorts by last update, newest first', async () => {
    await seed({
      name: 'Ana',
      email: 'ana@example.com',
      updatedAt: '2026-11-10T12:00:00Z',
    });
    await seed({
      name: 'Bruno',
      email: 'bruno@example.com',
      updatedAt: '2026-11-18T12:00:00Z',
    });
    await seed({
      name: 'Carla',
      email: 'carla@example.com',
      updatedAt: '2026-11-15T12:00:00Z',
    });

    const response = await asAna().list({ sort: '-updatedAt' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Bruno', 'Carla', 'Ana']);
  });

  it('AC-0006-24 pages a descending name sort with a tie at the page boundary', async () => {
    // descending: 49 "Zeca nn", two "Mara" (50th and 51st), 69 "Ana nn"
    const pad = (n: number) => String(n).padStart(2, '0');
    const high = Array.from({ length: 49 }, (_, i) => `Zeca ${pad(49 - i)}`);
    const low = Array.from({ length: 69 }, (_, i) => `Ana ${pad(69 - i)}`);
    const expectedNames = [...high, 'Mara', 'Mara', ...low];
    const all = [...low, 'Mara', 'Mara', ...high];
    const seeded = await seedMany(all, 'c');

    const first = await asAna().list({ sort: '-name' }).expect(200);
    const second = await asAna()
      .list({ sort: '-name', after: first.body.nextCursor })
      .expect(200);
    const third = await asAna()
      .list({ sort: '-name', after: second.body.nextCursor })
      .expect(200);

    const pages = [first, second, third];
    expect(pages.map((page) => page.body.clients.length)).toEqual([50, 50, 20]);
    expect(pages.flatMap((page) => namesOf(page.body))).toEqual(expectedNames);
    expect(first.body.clients.at(-1).name).toBe('Mara');
    expect(second.body.clients[0].name).toBe('Mara');
    const listed = pages.flatMap((page) => idsOf(page.body));
    expect(new Set(listed).size).toBe(120);
    const byText = (a: string, b: string) => a.localeCompare(b);
    expect([...listed].sort(byText)).toEqual(
      seeded.map((row) => row.id).sort(byText),
    );
  });

  it('AC-0006-25 rejects sort "phone" with clientSort.invalid', async () => {
    const response = await asAna().list({ sort: 'phone' }).expect(422);

    expect(response.body).toEqual({
      error: 'clientSort.invalid',
      field: 'sort',
    });
  });

  it('AC-0006-53 rejects sort "updatedAt" with clientSort.invalid', async () => {
    const response = await asAna().list({ sort: 'updatedAt' }).expect(422);

    expect(response.body).toEqual({
      error: 'clientSort.invalid',
      field: 'sort',
    });
  });

  it('AC-0006-26 rejects a cursor issued for another sort', async () => {
    await seed({ name: 'Ana Souza', email: 'ana@example.com' });
    await seed({ name: 'Bruno Lima', email: 'bruno@example.com' });
    const page = await asAna().list({ sort: 'name', limit: '1' }).expect(200);
    expect(typeof page.body.nextCursor).toBe('string');

    const response = await asAna()
      .list({ sort: '-updatedAt', after: page.body.nextCursor })
      .expect(422);

    expect(response.body).toEqual({ error: 'cursor.invalid', field: 'after' });
  });

  it('AC-0006-27 checks q before formId and sort', async () => {
    const response = await asAna()
      .list({ q: 'a', formId: 'not-an-id', sort: 'phone' })
      .expect(422);

    expect(response.body).toEqual({ error: 'clientSearch.min', field: 'q' });
  });

  it('AC-0006-42 checks formId before sort', async () => {
    const response = await asAna()
      .list({ formId: 'not-an-id', sort: 'phone' })
      .expect(422);

    expect(response.body).toEqual({ error: 'formId.invalid', field: 'formId' });
  });
});

describe('SPEC-0006 last update', () => {
  it('AC-0006-54 pages -updatedAt over 60 clients with one microsecond-precise time', async () => {
    await seedClients(
      ctx.pool,
      { tenantId: ana.tenantId, userId: userIdOf(ana), formId: ficha.id },
      60,
    );
    // microseconds: a cursor that cut them to milliseconds would skip or repeat rows (G-6)
    await setUpdatedAt(ctx.pool, ana.tenantId, '2026-11-18 15:30:00.123456+00');

    const first = await asAna().list({ sort: '-updatedAt' }).expect(200);
    const second = await asAna()
      .list({ sort: '-updatedAt', after: first.body.nextCursor })
      .expect(200);

    expect(first.body.clients).toHaveLength(50);
    expect(second.body.clients).toHaveLength(10);
    expect(second.body.nextCursor).toBeNull();
    const listed = [...idsOf(first.body), ...idsOf(second.body)];
    expect(new Set(listed).size).toBe(60);
    const { rows } = await ctx.pool.query(
      'select id from clients where tenant_id = $1',
      [ana.tenantId],
    );
    const byText = (a: string, b: string) => a.localeCompare(b);
    expect([...listed].sort(byText)).toEqual(
      rows.map((row: { id: string }) => row.id).sort(byText),
    );
    // R4: with equal times the order ends with the id, in the same direction
    expect(listed).toEqual(
      rows
        .map((row: { id: string }) => row.id)
        .sort()
        .reverse(),
    );
  });

  it('AC-0006-55 an edit moves the client up under -updatedAt', async () => {
    const anaSouza = await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      updatedAt: '2020-01-01T10:00:00Z',
    });
    await seed({
      name: 'Bruno Lima',
      email: 'bruno@example.com',
      updatedAt: '2020-01-02T10:00:00Z',
    });
    const before = await readClient(ctx, ana, anaSouza.id);
    const unedited = await asAna().list({ sort: '-updatedAt' }).expect(200);
    expect(namesOf(unedited.body)).toEqual(['Bruno Lima', 'Ana Souza']);

    await asAna()
      .update(anaSouza.id, updateBody(before, { phone: '11987654321' }))
      .expect(200);
    const response = await asAna().list({ sort: '-updatedAt' }).expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('AC-0006-56 an inactivation moves the client up under -updatedAt', async () => {
    const anaSouza = await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      updatedAt: '2020-01-01T10:00:00Z',
    });
    await seed({
      name: 'Bruno Lima',
      email: 'bruno@example.com',
      updatedAt: '2020-01-02T10:00:00Z',
    });

    const before = await asAna()
      .list({ status: 'all', sort: '-updatedAt' })
      .expect(200);
    expect(namesOf(before.body)).toEqual(['Bruno Lima', 'Ana Souza']);

    await asAna().inactivate(anaSouza.id).expect(200);
    const response = await asAna()
      .list({ status: 'all', sort: '-updatedAt' })
      .expect(200);

    expect(namesOf(response.body)).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('AC-0006-57 the list reports updatedAt as ISO-8601 UTC', async () => {
    await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      updatedAt: '2026-11-18T15:30:00.000Z',
    });

    const response = await asAna().list().expect(200);

    expect(response.body.clients[0].updatedAt).toBe('2026-11-18T15:30:00.000Z');
  });

  it('AC-0006-69 after an inactivation, the read and the list report the same later updatedAt', async () => {
    const anaSouza = await seed({
      name: 'Ana Souza',
      email: 'ana@example.com',
      updatedAt: '2020-01-01T10:00:00Z',
    });
    const before = await readClient(ctx, ana, anaSouza.id);

    await asAna().inactivate(anaSouza.id).expect(200);
    const after = await readClient(ctx, ana, anaSouza.id);
    const list = await asAna().list({ status: 'all' }).expect(200);

    expect(Date.parse(after.updatedAt)).toBeGreaterThan(
      Date.parse(before.updatedAt),
    );
    expect(list.body.clients[0].updatedAt).toBe(after.updatedAt);
  });
});
