import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventBus } from '@nestjs/cqrs';
import type { RegisterRequestInput } from '@planici/schemas';
import type { PasswordHasher } from '@shared/crypto/password.hasher.js';
import {
  EmailTakenError,
  InvalidTokenError,
  SlugTakenError,
} from '@modules/auth/domain/errors/auth.errors.js';
import { User } from '@modules/auth/domain/user.entity.js';
import type { UserRepository } from '../../ports/repositories/user.repository.js';
import type {
  GoogleAccount,
  GoogleVerifier,
} from '../../ports/services/google-verifier.js';
import type { SessionFactory } from '../../ports/services/session.factory.js';
import type { TokenService } from '../../ports/services/token.service.js';
import { RegisterUserCommand } from './register-user.command.js';
import { RegisterUserHandler } from './register-user.handler.js';

const context = { ip: '203.0.113.7', userAgent: 'vitest' };

const consent = {
  acceptedTerms: true as const,
  marketingOptIn: true,
  termsVersion: '2026-01-01',
  acceptedAt: '2026-11-01T12:00:00.000Z',
};

const base = {
  email: 'pro@planici.co',
  name: 'Ana',
  surname: 'Souza',
  slug: 'ana-souza',
  consent,
};

const googlePayload: RegisterRequestInput = {
  ...base,
  provider: 'google',
  idToken: 'google-id-token',
};

const emailPayload: RegisterRequestInput = {
  ...base,
  provider: 'email',
  password: 'planici1!',
  emailVerificationToken: 'email-proof',
};

const account: GoogleAccount = {
  providerAccountId: 'google-sub-1',
  email: 'pro@planici.co',
  emailVerified: true,
  givenName: 'Ana',
  familyName: 'Souza',
  picture: null,
};

const created = User.fromProps({
  id: 'user-1',
  email: 'pro@planici.co',
  slug: 'ana-souza',
  name: 'Ana',
  surname: 'Souza',
  displayName: null,
  avatarUrl: null,
  status: 'active',
  passwordHash: null,
  emailVerifiedAt: new Date(),
  passwordChangedAt: null,
  lastLoginAt: null,
});

describe('RegisterUserHandler', () => {
  let users: UserRepository;
  let tokens: TokenService;
  let google: GoogleVerifier;
  let hasher: PasswordHasher;
  let sessions: SessionFactory;
  let events: EventBus;
  let handler: RegisterUserHandler;

  beforeEach(() => {
    users = {
      emailExists: vi.fn().mockResolvedValue(false),
      slugExists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(created),
    } as unknown as UserRepository;
    tokens = {
      verifyEmailVerificationToken: vi.fn().mockResolvedValue('pro@planici.co'),
    } as unknown as TokenService;
    google = { verify: vi.fn().mockResolvedValue(account) };
    hasher = {
      hash: vi.fn().mockResolvedValue('bcrypt-hash'),
    } as unknown as PasswordHasher;
    sessions = {
      issue: vi.fn().mockResolvedValue({ accessToken: 'a' }),
    } as unknown as SessionFactory;
    events = { publish: vi.fn() } as unknown as EventBus;

    handler = new RegisterUserHandler(
      users,
      tokens,
      google,
      hasher,
      sessions,
      events,
    );
  });

  const register = (payload: RegisterRequestInput) =>
    handler.execute(new RegisterUserCommand(payload, context));

  describe('with Google', () => {
    it('creates a passwordless account linked to the Google id', async () => {
      await register(googlePayload);

      expect(google.verify).toHaveBeenCalledWith('google-id-token');
      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'pro@planici.co',
          slug: 'ana-souza',
          passwordHash: null,
          emailVerified: true,
        }),
        expect.any(Array),
        { providerAccountId: 'google-sub-1', email: 'pro@planici.co' },
      );
      expect(sessions.issue).toHaveBeenCalledWith(created, context);
    });

    it('refuses an id token for another address and stores nothing', async () => {
      vi.mocked(google.verify).mockResolvedValue({
        ...account,
        email: 'someone-else@planici.co',
      });

      await expect(register(googlePayload)).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
      expect(users.create).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('with e-mail and password', () => {
    it('stores the bcrypt hash and no Google identity', async () => {
      await register(emailPayload);

      expect(tokens.verifyEmailVerificationToken).toHaveBeenCalledWith(
        'email-proof',
      );
      expect(hasher.hash).toHaveBeenCalledWith('planici1!');
      const [data, , identity] = vi.mocked(users.create).mock.calls[0] ?? [];
      expect(data?.passwordHash).toBe('bcrypt-hash');
      expect(identity).toBeUndefined();
      expect(google.verify).not.toHaveBeenCalled();
    });

    it('refuses a proof token issued for another address before hashing', async () => {
      vi.mocked(tokens.verifyEmailVerificationToken).mockResolvedValue(
        'someone-else@planici.co',
      );

      await expect(register(emailPayload)).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['email', EmailTakenError],
    ['slug', SlugTakenError],
  ] as const)('refuses a taken %s and creates nothing', async (what, Error) => {
    vi.mocked(
      what === 'email' ? users.emailExists : users.slugExists,
    ).mockResolvedValue(true);

    await expect(register(googlePayload)).rejects.toBeInstanceOf(Error);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('records terms, privacy and the marketing choice with the request ip and agent', async () => {
    await register(googlePayload);

    const consents = vi.mocked(users.create).mock.calls[0]?.[1];
    const trail = {
      version: '2026-01-01',
      acceptedAt: new Date('2026-11-01T12:00:00.000Z'),
      ip: '203.0.113.7',
      userAgent: 'vitest',
    };
    expect(consents).toEqual([
      { ...trail, document: 'terms_of_service', granted: true },
      { ...trail, document: 'privacy_policy', granted: true },
      { ...trail, document: 'marketing', granted: true },
    ]);
  });
});
