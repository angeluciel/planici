import { beforeEach, describe, expect, vi, it } from 'vitest';
import { hashSecret } from '@/shared/crypto/hash.js';
import {
  InvalidTokenError,
  ExpiredTokenError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import { User } from '@/modules/auth/domain/user.entity.js';
import type {
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../../repositories/refresh-token.repository.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import { SessionFactory } from '../../services/section.factory.js';
import { RefreshSessionCommand } from './refresh-session.command.js';
import { RefreshSessionHandler } from './refresh-session.handler.js';

const context = { ip: '203.0.113.7', userAgent: 'vitest' };

const user = User.fromProps({
  id: 'user-1',
  email: 'pro@planici.co',
  slug: 'proplay',
  name: 'Bacano',
  surname: 'da Silva',
  displayName: null,
  avatarUrl: null,
  status: 'active',
  passwordHash: 'hash',
  emailVerifiedAt: new Date(),
  passwordChangedAt: null,
  lastLoginAt: null,
});

function stored(
  overrides: Partial<StoredRefreshToken> = {},
): StoredRefreshToken {
  return {
    id: 'token-1',
    userId: 'user-1',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    ...overrides,
  };
}

describe('RefreshSessionHandler', () => {
  let refreshTokens: RefreshTokenRepository;
  let users: UserRepository;
  let sessions: SessionFactory;
  let handler: RefreshSessionHandler;

  beforeEach(() => {
    refreshTokens = {
      store: vi.fn(),
      findByTokenHash: vi.fn(),
      revoke: vi.fn(),
      revokeFamily: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    users = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    sessions = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'b',
        expiresIn: 900,
        user: user.toPublic(),
      }),
    } as unknown as SessionFactory;

    handler = new RefreshSessionHandler(refreshTokens, users, sessions);
  });

  it('rotates: revokes the presented token and issues into the same family', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(stored());

    await handler.execute(new RefreshSessionCommand('raw-token', context));

    expect(refreshTokens.revoke).toHaveBeenCalledWith('token-1', 'rotated');
    expect(sessions.issue).toHaveBeenCalledWith(user, context, 'family-1');
  });

  it('looks the token up by hash, never by its raw value', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(stored());

    await handler.execute(new RefreshSessionCommand('raw-token', context));

    expect(refreshTokens.findByTokenHash).toHaveBeenCalledWith(
      hashSecret('raw-token'),
    );
  });

  it('nukes the whole family when a rotated token is reused', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(
      stored({ revokedAt: new Date() }),
    );

    await expect(
      handler.execute(new RefreshSessionCommand('leaked', context)),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(refreshTokens.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'reuse-detected',
    );
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('rejects an expired token without rotating it', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(
      stored({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(
      handler.execute(new RefreshSessionCommand('old', context)),
    ).rejects.toBeInstanceOf(ExpiredTokenError);
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('refuses an unknown token', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(null);

    await expect(
      handler.execute(new RefreshSessionCommand('nope', context)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('refuses to refresh a suspended account', async () => {
    vi.mocked(refreshTokens.findByTokenHash).mockResolvedValue(stored());
    vi.mocked(users.findById).mockResolvedValue(
      User.fromProps({
        ...user.toPublic(),
        status: 'suspended',
        passwordHash: null,
        emailVerifiedAt: null,
        passwordChangedAt: null,
        lastLoginAt: null,
        displayName: null,
      }),
    );

    await expect(
      handler.execute(new RefreshSessionCommand('raw-token', context)),
    ).rejects.toThrow(expect.objectContaining({ code: 'account.inactive' }));
  });
});
