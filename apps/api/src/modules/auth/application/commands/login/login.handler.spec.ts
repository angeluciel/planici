import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AccountLockedError,
  InvalidCredentialsError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import { User } from '@/modules/auth/domain/user.entity.js';
import type { LoginAttemptRepository } from '../../repositories/login-attempt.repository.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { GoogleVerifier } from '../../services/google-verifier.js';
import type { SessionFactory } from '../../services/section.factory.js';
import { LoginCommand } from './login.command.js';
import { LoginHandler } from './login.handler.js';
import { PasswordHasher } from '@/shared/crypto/password.hasher.js';

const config = {
  bcryptCost: 4,
  emailCodeTtlMinutes: 15,
  emailCodeMaxAttempts: 5,
  emailCodeResendSeconds: 60,
  passwordResetTtlMinutes: 60,
  loginMaxFailures: 3,
  loginLockoutMinutes: 15,
  googleClientId: '',
};

const context = { ip: '203.0.113.7', userAgent: 'vitest' };

const user = User.fromProps({
  id: 'user-1',
  email: 'pro@planici.co',
  slug: 'pro',
  name: 'Gael',
  surname: 'The Salve',
  displayName: null,
  avatarUrl: null,
  status: 'active',
  passwordHash: 'stored-hash-example',
  emailVerifiedAt: new Date(),
  passwordChangedAt: null,
  lastLoginAt: null,
});

const command = new LoginCommand(
  {
    provider: 'email',
    email: 'pro@planici.co',
    password: 'planici1!',
    rememberMe: false,
  },
  context,
);

describe('LoginHandler', () => {
  let users: UserRepository;
  let attempts: LoginAttemptRepository;
  let hasher: PasswordHasher;
  let sessions: SessionFactory;
  let handler: LoginHandler;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn().mockResolvedValue(user),
      findByGoogleAccountId: vi.fn(),
      linkGoogleIdentity: vi.fn(),
      recordLogin: vi.fn(),
    } as unknown as UserRepository;

    attempts = {
      find: vi.fn().mockResolvedValue(null),
      registerFailure: vi
        .fn()
        .mockResolvedValue({ failures: 1, lockedUntil: null }),
      clear: vi.fn(),
    };

    hasher = {
      verify: vi.fn().mockResolvedValue(true),
      hash: vi.fn(),
      fakeVerify: vi.fn(),
    } as unknown as PasswordHasher;

    sessions = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'b',
        expiresIn: 900,
        user: user.toPublic(),
      }),
    } as unknown as SessionFactory;

    handler = new LoginHandler(
      users,
      attempts,
      {} as GoogleVerifier,
      config,
      hasher,
      sessions,
    );
  });

  it('issues a session and clears the failure counter on success', async () => {
    await handler.execute(command);

    expect(attempts.clear).toHaveBeenCalledWith('pro@planici.co');
    expect(users.recordLogin).toHaveBeenCalledWith('user-1');
    expect(sessions.issue).toHaveBeenCalledWith(user, context);
  });

  it('counts a wrong password and reports only `credentials.invalid`', async () => {
    vi.mocked(hasher.verify).mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(attempts.registerFailure).toHaveBeenCalledWith(
      'pro@planici.co',
      context.ip,
      3,
      15,
    );
  });

  it('locks the account once the failure threshold is crossed', async () => {
    vi.mocked(hasher.verify).mockResolvedValue(false);
    vi.mocked(attempts.registerFailure).mockResolvedValue({
      failures: 3,
      lockedUntil: new Date(Date.now() + 900_000),
    });
    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      AccountLockedError,
    );
  });

  it('refuses a locked account before touching the password at all', async () => {
    vi.mocked(attempts.find).mockResolvedValue({
      failures: 3,
      lockedUntil: new Date(Date.now() + 900_000),
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      AccountLockedError,
    );
    expect(hasher.verify).not.toHaveBeenCalled();
  });

  it('lets a lapsed lock through', async () => {
    vi.mocked(attempts.find).mockResolvedValue({
      failures: 3,
      lockedUntil: new Date(Date.now() - 1),
    });

    await expect(handler.execute(command)).resolves.toMatchObject({
      accessToken: 'a',
    });
  });

  it('dilly dallies on unknown account, so timing cannot enumerate e-mails', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(hasher.fakeVerify).toHaveBeenCalled();
    expect(attempts.registerFailure).toHaveBeenCalled();
  });

  it('rejects Google-only account on the password form without leaking it exists', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(
      User.fromProps({
        id: 'user-2',
        email: 'pro@planici.co',
        slug: 'sluggish',
        name: 'Ana',
        surname: 'Souza',
        displayName: null,
        avatarUrl: null,
        status: 'active',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        passwordChangedAt: null,
        lastLoginAt: null,
      }),
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });
});
