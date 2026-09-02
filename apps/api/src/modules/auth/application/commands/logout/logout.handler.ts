import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from './logout.command.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../repositories/refresh-token.repository.js';
import { hashSecret } from '@/shared/crypto/hash.js';
import { Inject } from '@nestjs/common';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}
  /**
   * Idempotent, why not
   * */
  async execute(command: LogoutCommand): Promise<void> {
    const stored = await this.refreshTokens.findByTokenHash(
      hashSecret(command.refreshToken),
    );
    if (!stored || stored.revokedAt) return;

    await this.refreshTokens.revokeFamily(stored.familyId, 'logout');
  }
}
