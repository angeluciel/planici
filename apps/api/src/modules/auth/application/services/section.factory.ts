import { Inject, Injectable } from '@nestjs/common';
import type { SessionResponse } from '@planici/schemas';
import { hashSecret } from '@/shared/crypto/hash.js';
import type { User } from '../../domain/user.entity.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenContext,
  type RefreshTokenRepository,
} from '@/modules/auth/application/repositories/refresh-token.repository.js';
import { TOKEN_SERVICE, type TokenService } from './token.service.js';

/**
 * Every path stores the refresh tokenh the same way (with a family id and hashed)
 */

@Injectable()
export class SessionFactory {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async issue(
    user: User,
    context: RefreshTokenContext,
    familyId?: string,
  ): Promise<SessionResponse> {
    const access = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
    });

    const refresh = this.tokens.issueRefreshToken(familyId);

    await this.refreshTokens.store(
      user.id,
      hashSecret(refresh.token),
      refresh.familyId,
      refresh.expiresAt,
      context,
    );

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresIn: access.expiresIn,
      user: user.toPublic(),
    };
  }
}
