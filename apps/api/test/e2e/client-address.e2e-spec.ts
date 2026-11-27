import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  codeFrom,
  createTestApp,
  type TestContext,
} from '../setup/test-app.js';

// SPEC-0009: what the API stores and limits for the client address the web
// app forwards in X-Forwarded-For (P-9). The web app is a caller on loopback,
// the default TRUSTED_CALLERS, so the app listens on 127.0.0.1.

const EMAIL = 'ana@example.com';
const NEW_EMAIL = 'nova@example.com';
const PASSWORD = 'password123!';
const DEVICE = '203.0.113.7';
const OTHER_DEVICE = '203.0.113.8';

let ctx: TestContext;
let url: string;

async function listen(context: TestContext): Promise<string> {
  await context.app.listen(0, '127.0.0.1');
  return `http://127.0.0.1:${(context.app.getHttpServer().address() as AddressInfo).port}`;
}

// a call the web app makes for a browser request from `address`
const asWebApp = (address?: string) => {
  const api = request(url);
  const stated = <T extends request.Test>(test: T): T =>
    address ? (test.set('X-Forwarded-For', address) as T) : test;

  return {
    get: (path: string) => stated(api.get(path)),
    post: (path: string) => stated(api.post(path)),
  };
};

function consent() {
  return {
    acceptedTerms: true,
    marketingOptIn: false,
    termsVersion: '2026-01-01',
    acceptedAt: new Date().toISOString(),
  };
}

async function register(
  address: string,
  email = EMAIL,
  slug = 'ana',
): Promise<request.Response> {
  const web = asWebApp(address);
  await web.post('/v1/auth/email/code').send({ email }).expect(202);
  const code = codeFrom(await ctx.mailer.waitFor(email));
  const verified = await web
    .post('/v1/auth/email/verify')
    .send({ email, code })
    .expect(200);

  return web.post('/v1/auth/register').send({
    provider: 'email',
    email,
    password: PASSWORD,
    emailVerificationToken: verified.body.emailVerificationToken,
    name: 'Ana',
    surname: 'Souza',
    slug,
    consent: consent(),
  });
}

async function registered(
  address: string,
  email = EMAIL,
  slug = 'ana',
): Promise<request.Response> {
  const response = await register(address, email, slug);
  expect(response.status).toBe(201);
  return response;
}

async function sessionAddresses(userId: string): Promise<string[]> {
  const { rows } = await ctx.pool.query(
    'select ip from refresh_tokens where user_id = $1',
    [userId],
  );
  return rows.map((row) => row.ip).sort();
}

describe('client address stored from the forwarded address', () => {
  beforeAll(async () => {
    ctx = await createTestApp();
    url = await listen(ctx);
  });

  beforeEach(async () => {
    await ctx.truncate();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('AC-0009-01 registration stores the forwarded address on the three acceptance records', async () => {
    const response = await registered(DEVICE);

    const { rows } = await ctx.pool.query(
      'select document, ip from user_consents where user_id = $1',
      [response.body.user.id],
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.ip)).toEqual([DEVICE, DEVICE, DEVICE]);
  });

  it('AC-0009-02 sign-in stores the forwarded address on the session record', async () => {
    const session = await registered(OTHER_DEVICE);

    await asWebApp(DEVICE)
      .post('/v1/auth/login')
      .send({ provider: 'email', email: EMAIL, password: PASSWORD })
      .expect(200);

    expect(await sessionAddresses(session.body.user.id)).toEqual([
      DEVICE,
      OTHER_DEVICE,
    ]);
  });

  it('AC-0009-03 refresh stores the forwarded address on the new session record', async () => {
    const session = await registered(DEVICE);

    await asWebApp(OTHER_DEVICE)
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.body.refreshToken })
      .expect(200);

    expect(await sessionAddresses(session.body.user.id)).toEqual([
      DEVICE,
      OTHER_DEVICE,
    ]);
  });

  it('AC-0009-04 a failed sign-in stores the forwarded address as the last address', async () => {
    await registered(OTHER_DEVICE);

    await asWebApp(DEVICE)
      .post('/v1/auth/login')
      .send({ provider: 'email', email: EMAIL, password: 'wrong-pass1!' })
      .expect(401);

    const { rows } = await ctx.pool.query(
      'select last_ip from login_attempts where email = $1',
      [EMAIL],
    );
    expect(rows).toEqual([{ last_ip: DEVICE }]);
  });

  it('AC-0009-05 an e-mail code request stores the forwarded address', async () => {
    await asWebApp(DEVICE)
      .post('/v1/auth/email/code')
      .send({ email: NEW_EMAIL })
      .expect(202);

    const { rows } = await ctx.pool.query(
      'select request_ip from email_verifications where email = $1',
      [NEW_EMAIL],
    );
    expect(rows).toEqual([{ request_ip: DEVICE }]);
  });

  it('AC-0009-06 a password reset request stores the forwarded address', async () => {
    await registered(OTHER_DEVICE);

    await asWebApp(DEVICE)
      .post('/v1/auth/password/forgot')
      .send({ email: EMAIL })
      .expect(202);

    const { rows } = await ctx.pool.query(
      `select t.request_ip from password_reset_tokens t
         join users u on u.id = t.user_id where u.email = $1`,
      [EMAIL],
    );
    expect(rows).toEqual([{ request_ip: DEVICE }]);
  });

  it('AC-0009-13 stores a forwarded IPv6 address as received', async () => {
    await asWebApp('2001:db8::7')
      .post('/v1/auth/email/code')
      .send({ email: NEW_EMAIL })
      .expect(202);

    const { rows } = await ctx.pool.query(
      'select request_ip from email_verifications where email = $1',
      [NEW_EMAIL],
    );
    expect(rows).toEqual([{ request_ip: '2001:db8::7' }]);
  });

  it('AC-0009-16 sign-in, refresh and profile responses never contain the forwarded address', async () => {
    const session = await registered(DEVICE);
    const login = await asWebApp(DEVICE)
      .post('/v1/auth/login')
      .send({ provider: 'email', email: EMAIL, password: PASSWORD })
      .expect(200);
    const refresh = await asWebApp(DEVICE)
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    const me = await asWebApp(DEVICE)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${session.body.accessToken}`)
      .expect(200);

    for (const response of [login, refresh, me]) {
      expect(JSON.stringify(response.body)).not.toContain(DEVICE);
      expect(JSON.stringify(response.headers)).not.toContain(DEVICE);
    }
  });
});

describe('per-address rate limit counts the forwarded address', () => {
  const LIMIT = 20;

  beforeAll(async () => {
    // the e2e env disables the limiter; skipIf reads it on each request
    vi.stubEnv('THROTTLE_DISABLED', 'false');
    ctx = await createTestApp();
    url = await listen(ctx);
  });

  afterAll(async () => {
    await ctx?.close();
    vi.unstubAllEnvs();
  });

  const check = (address: string) =>
    asWebApp(address).get('/v1/auth/availability').query({ email: NEW_EMAIL });

  it('AC-0009-09 two forwarded addresses get separate availability budgets', async () => {
    for (let i = 0; i < LIMIT; i++) {
      await check('203.0.113.21').expect(200);
    }

    const over = await check('203.0.113.21');
    const other = await check('203.0.113.22');

    expect(over.status).toBe(429);
    expect(over.body).toEqual({ error: 'code.rate-limited' });
    expect(other.status).toBe(200);
  });

  it('AC-0009-10 AC-0009-11 the 21st availability check from one forwarded address is answered 429', async () => {
    for (let i = 0; i < LIMIT; i++) {
      await check('203.0.113.23').expect(200);
    }

    const over = await check('203.0.113.23');

    expect(over.status).toBe(429);
    expect(over.body).toEqual({ error: 'code.rate-limited' });
  });
});

// A caller other than the web app: it connects from 127.0.0.2 while the API
// trusts 127.0.0.1 only. Documentation addresses cannot be bound locally (P-9).
async function canBind(address: string): Promise<string | null> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', (error) => resolve(error.message));
    server.listen(0, address, () => server.close(() => resolve(null)));
  });
}

const bindProblem = await canBind('127.0.0.2');
if (bindProblem) {
  console.warn(
    `AC-0009-15 skipped: cannot bind 127.0.0.2 here (${bindProblem}); Linux routes all of 127.0.0.0/8, macOS needs an alias.`,
  );
}

describe('a caller other than the web app', () => {
  beforeAll(async () => {
    ctx = await createTestApp({ trustedCallers: '127.0.0.1' });
    url = await listen(ctx);
  });

  beforeEach(async () => {
    await ctx.truncate();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it.skipIf(bindProblem !== null)(
    'AC-0009-15 a caller other than the web app is stored with its own address',
    async () => {
      const { port } = new URL(url);
      const body = JSON.stringify({ email: NEW_EMAIL });

      const status = await new Promise<number>((resolve, reject) => {
        const call = httpRequest(
          {
            host: '127.0.0.1',
            port: Number(port),
            path: '/v1/auth/email/code',
            method: 'POST',
            localAddress: '127.0.0.2',
            headers: {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(body),
              'x-forwarded-for': '203.0.113.50',
            },
          },
          (response) => {
            response.resume();
            response.on('end', () => resolve(response.statusCode ?? 0));
          },
        );
        call.on('error', reject);
        call.end(body);
      });
      expect(status).toBe(202);

      const { rows } = await ctx.pool.query(
        'select request_ip from email_verifications where email = $1',
        [NEW_EMAIL],
      );
      expect(rows).toEqual([{ request_ip: '127.0.0.2' }]);
    },
  );
});
