import { TENANT_ID_PATTERN } from '@planici/schemas';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { codeFrom, createTestApp, TestContext } from '../setup/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());

async function signUp(email: string, slug: string): Promise<string> {
  await api().post('/v1/auth/email/code').send({ email }).expect(202);

  const code = codeFrom(await ctx.mailer.waitFor(email));
  const verified = await api()
    .post('/v1/auth/email/verify')
    .send({ email, code })
    .expect(200);

  const response = await api()
    .post('/v1/auth/register')
    .send({
      provider: 'email',
      email,
      password: 'password123!',
      emailVerificationToken: verified.body.emailVerificationToken,
      name: 'Ana',
      surname: 'Souza',
      slug,
      consent: {
        acceptedTerms: true,
        marketingOptIn: false,
        termsVersion: '2026-01-01',
        acceptedAt: new Date().toISOString(),
      },
    })
    .expect(201);

  return response.body.accessToken;
}

function createTenant(token: string, body: object) {
  return api()
    .post('/v1/tenants')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  await ctx.truncate();
});

afterAll(async () => {
  await ctx?.close();
});

describe('create tenant', () => {
  it('creates the workspace with the caller as owner', async () => {
    const token = await signUp('ana@planici.co', 'ana');

    const response = await createTenant(token, {
      name: 'Studio Ana',
      slug: 'Studio-Ana',
    }).expect(201);

    expect(response.body).toMatchObject({
      name: 'Studio Ana',
      slug: 'studio-ana',
      status: 'active',
      plan: 'free',
      role: 'owner',
    });
    expect(response.body.id).toMatch(TENANT_ID_PATTERN);
    expect(response.body.id).toMatch(/^studio-ana-/);

    const { rows } = await ctx.pool.query(
      'select role from tenant_memberships where tenant_id = $1',
      [response.body.id],
    );
    expect(rows).toEqual([{ role: 'owner' }]);
  });

  it('rejects a slug another workspace already uses', async () => {
    const ana = await signUp('ana@planici.co', 'ana');
    const bia = await signUp('bia@planici.co', 'bia');

    await createTenant(ana, { name: 'Studio', slug: 'studio' }).expect(201);
    const response = await createTenant(bia, {
      name: 'Studio',
      slug: 'studio',
    }).expect(409);

    expect(response.body).toEqual({ error: 'tenantSlug.taken', field: 'slug' });
  });

  it('validates the payload', async () => {
    const token = await signUp('ana@planici.co', 'ana');

    const response = await createTenant(token, {
      name: 'Studio',
      slug: 'not a slug',
    }).expect(422);

    expect(response.body).toEqual({
      error: 'tenantSlug.pattern',
      field: 'slug',
    });
  });

  it('requires a session', async () => {
    await api()
      .post('/v1/tenants')
      .send({ name: 'Studio', slug: 'studio' })
      .expect(401);
  });
});

describe('list, read and rename', () => {
  it('lists only the caller’s workspaces', async () => {
    const ana = await signUp('ana@planici.co', 'ana');
    const bia = await signUp('bia@planici.co', 'bia');

    await createTenant(ana, { name: 'Studio Ana', slug: 'studio-ana' });
    await createTenant(bia, { name: 'Studio Bia', slug: 'studio-bia' });

    const response = await api()
      .get('/v1/tenants')
      .set('Authorization', `Bearer ${ana}`)
      .expect(200);

    expect(response.body.tenants).toHaveLength(1);
    expect(response.body.tenants[0].slug).toBe('studio-ana');
  });

  it('starts empty, which sends the web app to onboarding', async () => {
    const token = await signUp('ana@planici.co', 'ana');

    const response = await api()
      .get('/v1/tenants')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({ tenants: [] });
  });

  it('hides another user’s workspace (RN-02)', async () => {
    const ana = await signUp('ana@planici.co', 'ana');
    const bia = await signUp('bia@planici.co', 'bia');

    const created = await createTenant(ana, {
      name: 'Studio Ana',
      slug: 'studio-ana',
    }).expect(201);

    const read = await api()
      .get(`/v1/tenants/${created.body.id}`)
      .set('Authorization', `Bearer ${bia}`)
      .expect(404);
    expect(read.body).toEqual({ error: 'tenant.not-found' });

    await api()
      .patch(`/v1/tenants/${created.body.id}`)
      .set('Authorization', `Bearer ${bia}`)
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('treats an id that is not a tenant id as not found', async () => {
    const token = await signUp('ana@planici.co', 'ana');

    const response = await api()
      .get('/v1/tenants/0f8c4b1e-6a47-4c4f-9a39-3f1f2b2f5a10')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(response.body).toEqual({ error: 'tenant.not-found' });
  });

  it('renames the workspace', async () => {
    const token = await signUp('ana@planici.co', 'ana');
    const created = await createTenant(token, {
      name: 'Studio Ana',
      slug: 'studio-ana',
    }).expect(201);

    const response = await api()
      .patch(`/v1/tenants/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana Souza Studio' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      name: 'Ana Souza Studio',
      slug: 'studio-ana',
    });
  });

  it('refuses a suspended workspace', async () => {
    const token = await signUp('ana@planici.co', 'ana');
    const created = await createTenant(token, {
      name: 'Studio Ana',
      slug: 'studio-ana',
    }).expect(201);

    await ctx.pool.query(
      `update tenants set status = 'suspended' where id = $1`,
      [created.body.id],
    );

    const response = await api()
      .get(`/v1/tenants/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(response.body).toEqual({ error: 'tenant.inactive' });
  });
});

describe('slug availability', () => {
  it('reports taken and free slugs', async () => {
    const token = await signUp('ana@planici.co', 'ana');
    await createTenant(token, { name: 'Studio', slug: 'studio' }).expect(201);

    const taken = await api()
      .get('/v1/tenants/availability')
      .query({ slug: 'studio' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const free = await api()
      .get('/v1/tenants/availability')
      .query({ slug: 'other' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(taken.body).toEqual({ available: false });
    expect(free.body).toEqual({ available: true });
  });
});
