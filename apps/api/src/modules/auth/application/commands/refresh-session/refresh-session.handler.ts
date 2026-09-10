import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { SessionResponse } from '@planici/schemas';
import { hashSecret } from '@/shared/crypto/hash.js';
import {
  ExpiredTokenError,
  InvalidTokenError,
} from '@/modules/auth/domain/errors/auth.errors.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../repositories/refresh-token.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { SessionFactory } from '../../services/section.factory.js';
import { RefreshSessionCommand } from './refresh-session.command.js';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  private readonly logger = new Logger(RefreshSessionHandler.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly sessions: SessionFactory,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<SessionResponse> {
    const stored = await this.refreshTokens.findByTokenHash(
      hashSecret(command.refreshToken),
    );
    if (!stored) throw new InvalidTokenError();

    if (stored.revokedAt) {
      /**
       * if a revoked token is present nuke the whole generation
       */
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking family.`,
      );
      await this.refreshTokens.revokeFamily(stored.familyId, 'reuse-detected');
      throw new InvalidTokenError();
    }

    if (stored.expiresAt.getTime() <= Date.now()) throw new ExpiredTokenError();

    const user = await this.users.findById(stored.userId);
    if (!user) throw new InvalidTokenError();
    user.assertCanAuthenticate();

    await this.refreshTokens.revoke(stored.id, 'rotated');
    return this.sessions.issue(user, command.context, stored.familyId);
  }
}
