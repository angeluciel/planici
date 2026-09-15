import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { codeFrom, createTestApp, TestContext } from '../setup/test-app.js';

const EMAIL = 'ana@planici.co';
const PASSWORD = 'planici123!';
const TERMS_VERSION = '2026-01-01';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());

function consent(marketingOptIn = false) {
  return {
    acceptedTerms: true,
    marketingOptIn,
    termsVersion: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
}

async function verifiedEmailToken(email: string): Promise<string> {
  await api().post('/v1/auth/email/code').send({ email }).expect(202);

  const code = codeFrom(await ctx.mailer.waitFor(email));
  const response = await api()
    .post('/v1/auth/email/verify')
    .send({ email, code })
    .expect(200);

  return response.body.emailVerificationToken;
}

async function register(
  email = EMAIL,
  slug = 'ana',
): Promise<request.Response> {
  const emailVerificationToken = await verifiedEmailToken(email);

  return api().post('/v1/auth/register').send({
    provider: 'email',
    email,
    password: PASSWORD,
    emailVerificationToken,
    name: 'Ana',
    surname: 'Souza',
    slug,
    consent: consent(),
  });
}

async function registered(
  email = EMAIL,
  slug = 'ana',
): Promise<request.Response> {
  const response = await register(email, slug);
  expect(response.status).toBe(201);

  return response;
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

describe('register', () => {
  it('mails a code, exchanges it for a proof token and created the account', async () => {
    const response = await registered();

    expect(response.body.user).toMatchObject({
      email: EMAIL,
      slug: 'ana',
      emailVerified: true,
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
  });

  it('records the consent trail', async () => {
    const response = await registered();

    const { rows } = await ctx.pool.query(
      'select document, granted, version from user_consents where user_id = $1',
      [response.body.user.id],
    );

    expect(rows).toHaveLength(3);
    expect(
      rows.find((row) => row.document === 'terms_of_service'),
    ).toMatchObject({
      granted: true,
      version: TERMS_VERSION,
    });
    expect(rows.find((row) => row.document === 'marketing')).toMatchObject({
      granted: false,
    });
  });

  it('stores a bcrypt hash, not the plaintext password', async () => {
    await registered();

    const { rows } = await ctx.pool.query(
      'select password_hash from users where email = $1',
      [EMAIL],
    );

    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain(PASSWORD);
  });

  it('refuses a password that breaks the schema', async () => {
    const emailVerificationToken = await verifiedEmailToken(EMAIL);

    const response = await api()
      .post('/v1/auth/register')
      .send({
        provider: 'email',
        email: EMAIL,
        password: 'abcdefgh',
        name: 'Ana',
        surname: 'Banana',
        slug: 'ana',
        consent: consent(),
      })
      .expect(422);

    expect(response.body).toMatchObject({
      error: 'password.number',
      field: 'password',
    });
  });

  it('refuses to register without a proof token', async () => {
    const response = await api()
      .post('/v1/auth/register')
      .send({
        provider: 'email',
        email: EMAIL,
        password: PASSWORD,
        name: 'Ana',
        surname: 'Banana',
        slug: 'ana',
        consent: consent(),
      })
      .expect(422);

    expect(response.body.error).toBe('token.invalid');
  });

  it('will not spend a proof token created for a different address', async () => {
    const emailVerificationToken = await verifiedEmailToken('seila@planici.co');

    const response = await api()
      .post('/v1/auth/register')
      .send({
        provider: 'email',
        email: EMAIL,
        password: PASSWORD,
        emailVerificationToken,
        name: 'Ana',
        surname: 'Banana',
        slug: 'ana',
        consent: consent(),
      })
      .expect(401);

    expect(response.body.error).toBe('token.invalid');
  });

  it('rejects a second account on the same e-mail', async () => {
    await registered();

    const response = await api()
      .post('/v1/auth/email/code')
      .send({ email: EMAIL })
      .expect(409);

    expect(response.body).toMatchObject({
      error: 'email.token',
      field: 'email',
    });
  });

  it('rejects a slug someone already took', async () => {
    await registered();

    const response = await register('sla@planici.co', 'ana');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: 'slug.taken', field: 'slug' });
  });

  it('rejects a wrong code and stops guessing at the attempt cap', async () => {
    await api().post('/v1/auth/email/code').send({ email: EMAIL }).expect(202);

    await ctx.mailer.waitFor(EMAIL);

    const errors: string[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await api()
        .post('/v1/auth/email/verify')
        .send({ email: EMAIL, code: '000000' });
      errors.push(response.body.error);
    }

    expect(errors[0]).toBe('code.invalid');
    expect(errors.at(-1)).toBe('code.attempts');
  });
});
