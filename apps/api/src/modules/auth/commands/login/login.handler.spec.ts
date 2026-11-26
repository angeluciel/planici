import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AccountInactiveError,
  AccountLockedError,
  GoogleInvalidTokenError,
  InvalidCredentialsError,
} from '@modules/auth/domain/errors/auth.errors.js';
import { User } from '@modules/auth/domain/user.entity.js';
import type { LoginAttemptRepository } from '../../ports/repositories/login-attempt.repository.js';
import type { UserRepository } from '../../ports/repositories/user.repository.js';
import type {
  GoogleAccount,
  GoogleVerifier,
} from '../../ports/services/google-verifier.js';
import type { SessionFactory } from '../../ports/services/session.factory.js';
import { LoginCommand } from './login.command.js';
import { LoginHandler } from './login.handler.js';
import { PasswordHasher } from '@shared/crypto/password.hasher.js';

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

describe('LoginHandler with Google', () => {
  const googleCommand = new LoginCommand(
    { provider: 'google', idToken: 'google-id-token', rememberMe: false },
    context,
  );

  const account: GoogleAccount = {
    providerAccountId: 'google-sub-1',
    email: 'pro@planici.co',
    emailVerified: true,
    givenName: 'Gael',
    familyName: null,
    picture: null,
  };

  let users: UserRepository;
  let google: GoogleVerifier;
  let sessions: SessionFactory;
  let handler: LoginHandler;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByGoogleAccountId: vi.fn().mockResolvedValue(null),
      linkGoogleIdentity: vi.fn(),
      recordLogin: vi.fn(),
    } as unknown as UserRepository;
    google = { verify: vi.fn().mockResolvedValue(account) };
    sessions = {
      issue: vi.fn().mockResolvedValue({ accessToken: 'a' }),
    } as unknown as SessionFactory;

    handler = new LoginHandler(
      users,
      {} as LoginAttemptRepository,
      google,
      config,
      {} as PasswordHasher,
      sessions,
    );
  });

  it('signs in the account already linked to the Google id, without linking again', async () => {
    vi.mocked(users.findByGoogleAccountId).mockResolvedValue(user);

    await handler.execute(googleCommand);

    expect(google.verify).toHaveBeenCalledWith('google-id-token');
    expect(users.findByGoogleAccountId).toHaveBeenCalledWith('google-sub-1');
    expect(users.linkGoogleIdentity).not.toHaveBeenCalled();
    expect(users.recordLogin).toHaveBeenCalledWith('user-1');
    expect(sessions.issue).toHaveBeenCalledWith(user, context);
  });

  it('links Google to the password account with the same verified e-mail', async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(user);

    await handler.execute(googleCommand);

    expect(users.findByEmail).toHaveBeenCalledWith('pro@planici.co');
    expect(users.linkGoogleIdentity).toHaveBeenCalledWith('user-1', {
      providerAccountId: 'google-sub-1',
      email: 'pro@planici.co',
    });
    expect(sessions.issue).toHaveBeenCalledWith(user, context);
  });

  it('never links on an e-mail Google has not verified', async () => {
    vi.mocked(google.verify).mockResolvedValue({
      ...account,
      emailVerified: false,
    });
    vi.mocked(users.findByEmail).mockResolvedValue(user);

    await expect(handler.execute(googleCommand)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(users.linkGoogleIdentity).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('answers credentials.invalid when no account matches, instead of creating one', async () => {
    await expect(handler.execute(googleCommand)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(users.linkGoogleIdentity).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('refuses an inactive linked account before recording the login', async () => {
    vi.mocked(users.findByGoogleAccountId).mockResolvedValue(
      User.fromProps({
        id: 'user-3',
        email: 'pro@planici.co',
        slug: 'pro',
        name: 'Gael',
        surname: 'The Salve',
        displayName: null,
        avatarUrl: null,
        status: 'suspended',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        passwordChangedAt: null,
        lastLoginAt: null,
      }),
    );

    await expect(handler.execute(googleCommand)).rejects.toBeInstanceOf(
      AccountInactiveError,
    );
    expect(users.recordLogin).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('passes a rejected Google token on and looks nothing up', async () => {
    vi.mocked(google.verify).mockRejectedValue(new GoogleInvalidTokenError());

    await expect(handler.execute(googleCommand)).rejects.toBeInstanceOf(
      GoogleInvalidTokenError,
    );
    expect(users.findByGoogleAccountId).not.toHaveBeenCalled();
    expect(users.findByEmail).not.toHaveBeenCalled();
  });
});
