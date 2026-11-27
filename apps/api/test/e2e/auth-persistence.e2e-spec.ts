import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AuthPersistenceError,
  EmailTakenError,
  SlugTakenError,
} from '@modules/auth/domain/errors/auth.errors.js';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '@modules/auth/ports/repositories/email-verification.repository.js';
import {
  LOGIN_ATTEMPT_REPOSITORY,
  type LoginAttemptRepository,
} from '@modules/auth/ports/repositories/login-attempt.repository.js';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordResetRepository,
} from '@modules/auth/ports/repositories/password-reset.repository.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '@modules/auth/ports/repositories/refresh-token.repository.js';
import {
  type GoogleIdentityData,
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/auth/ports/repositories/user.repository.js';
import { createTestApp, type TestContext } from '../setup/test-app.js';

const EMAIL = 'ana@planici.co';
const OTHER_EMAIL = 'bia@planici.co';
const GOOGLE_SUB = 'google-sub-0001';

/** Postgres rejects a NUL byte in any text or uuid parameter, so every query given it fails. */
const MARKER = 'marker\u0000';

let ctx: TestContext;
let users: UserRepository;
let emailVerifications: EmailVerificationRepository;
let loginAttempts: LoginAttemptRepository;
let passwordResets: PasswordResetRepository;
let refreshTokens: RefreshTokenRepository;

function create(
  email: string,
  slug: string,
  identity?: GoogleIdentityData,
): ReturnType<UserRepository['create']> {
  return users.create(
    {
      email,
      slug,
      name: 'Ana',
      surname: 'Souza',
      passwordHash: identity ? null : 'placeholder-password-hash',
      emailVerified: true,
    },
    [],
    identity,
  );
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('expected the query to fail');
}

beforeAll(async () => {
  ctx = await createTestApp();
  users = ctx.app.get(USER_REPOSITORY);
  emailVerifications = ctx.app.get(EMAIL_VERIFICATION_REPOSITORY);
  loginAttempts = ctx.app.get(LOGIN_ATTEMPT_REPOSITORY);
  passwordResets = ctx.app.get(PASSWORD_RESET_REPOSITORY);
  refreshTokens = ctx.app.get(REFRESH_TOKEN_REPOSITORY);
});

afterAll(async () => {
  await ctx.close();
});

beforeEach(async () => {
  await ctx.truncate();
});

// The register handler checks e-mail and slug before the insert; these cover the
// insert losing a race to another register, where only the unique index stops it.
describe('DrizzleUserRepository.create', () => {
  it('turns a duplicate e-mail into EmailTakenError', async () => {
    await create(EMAIL, 'ana');

    const error = await failureOf(create(EMAIL, 'bia'));

    expect(error).toBeInstanceOf(EmailTakenError);
  });

  it('turns a duplicate slug into SlugTakenError', async () => {
    await create(EMAIL, 'ana');

    const error = await failureOf(create(OTHER_EMAIL, 'ana'));

    expect(error).toBeInstanceOf(SlugTakenError);
  });

  it('hides the query parameters of any other failure, such as a Google account linked to another user', async () => {
    await create(EMAIL, 'ana', { providerAccountId: GOOGLE_SUB, email: EMAIL });

    const error = await failureOf(
      create(OTHER_EMAIL, 'bia', {
        providerAccountId: GOOGLE_SUB,
        email: OTHER_EMAIL,
      }),
    );

    expect(String(error)).not.toContain(OTHER_EMAIL);
    expect(error).toBeInstanceOf(AuthPersistenceError);
    expect(error).toMatchObject({
      pgCode: '23505',
      constraint: 'idx_identities_provider_account',
    });
    expect((error as Error).cause).toBeUndefined();
    // the user row went back with the transaction
    expect(await users.emailExists(OTHER_EMAIL)).toBe(false);
  });
});

// Drizzle's own error message lists the query parameters (e-mails, code, token and
// password hashes, IPs), and the exception filter logs the stack of any 500.
describe('auth repositories on a failed query', () => {
  const queries: [string, () => Promise<unknown>][] = [
    ['users.findByEmail', () => users.findByEmail(MARKER)],
    ['users.findById', () => users.findById(MARKER)],
    ['users.findByGoogleAccountId', () => users.findByGoogleAccountId(MARKER)],
    ['users.emailExists', () => users.emailExists(MARKER)],
    ['users.slugExists', () => users.slugExists(MARKER)],
    [
      'users.linkGoogleIdentity',
      () =>
        users.linkGoogleIdentity(MARKER, {
          providerAccountId: MARKER,
          email: MARKER,
        }),
    ],
    ['users.updatePassword', () => users.updatePassword(MARKER, MARKER)],
    ['users.markEmailVerifier', () => users.markEmailVerifier(MARKER)],
    ['users.recordLogin', () => users.recordLogin(MARKER)],
    [
      'emailVerifications.issue',
      () => emailVerifications.issue(MARKER, MARKER, new Date(), MARKER),
    ],
    [
      'emailVerifications.findActive',
      () => emailVerifications.findActive(MARKER),
    ],
    [
      'emailVerifications.findLatest',
      () => emailVerifications.findLatest(MARKER),
    ],
    [
      'emailVerifications.incrementAttempts',
      () => emailVerifications.incrementAttempts(MARKER),
    ],
    ['emailVerifications.consume', () => emailVerifications.consume(MARKER)],
    ['loginAttempts.find', () => loginAttempts.find(MARKER)],
    [
      'loginAttempts.registerFailure',
      () => loginAttempts.registerFailure(MARKER, MARKER, 5, 15),
    ],
    ['loginAttempts.clear', () => loginAttempts.clear(MARKER)],
    [
      'passwordResets.issue',
      () => passwordResets.issue(MARKER, MARKER, new Date(), MARKER),
    ],
    [
      'passwordResets.findByTokenHash',
      () => passwordResets.findByTokenHash(MARKER),
    ],
    ['passwordResets.consume', () => passwordResets.consume(MARKER)],
    [
      'refreshTokens.store',
      () =>
        refreshTokens.store(MARKER, MARKER, MARKER, new Date(), {
          ip: MARKER,
          userAgent: MARKER,
        }),
    ],
    [
      'refreshTokens.findByTokenHash',
      () => refreshTokens.findByTokenHash(MARKER),
    ],
    ['refreshTokens.revoke', () => refreshTokens.revoke(MARKER, 'logout')],
    [
      'refreshTokens.revokeFamily',
      () => refreshTokens.revokeFamily(MARKER, 'logout'),
    ],
    [
      'refreshTokens.revokeAllForUser',
      () => refreshTokens.revokeAllForUser(MARKER, 'logout'),
    ],
  ];

  it.each(queries)(
    '%s throws AuthPersistenceError without its parameters',
    async (_name, query) => {
      const error = await failureOf(query());

      expect(String(error)).not.toContain('marker');
      expect(error).toBeInstanceOf(AuthPersistenceError);
      expect((error as AuthPersistenceError).pgCode).toMatch(/^[0-9A-Z]{5}$/);
      expect((error as Error).cause).toBeUndefined();
    },
  );
});
