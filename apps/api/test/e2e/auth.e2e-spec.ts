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
});
