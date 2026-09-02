import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jwtConfig } from '@/config/namespaces/jwt.config.js';
import { TokenGenerator } from '@/shared/crypto/token.generator.js';
import type {
  AccessTokenPayload,
  IssuedRefreshToken,
  TokenService,
} from '../../application/services/token.service.js';
import {
  ExpiredTokenError,
  InvalidTokenError,
} from '../../domain/errors/auth.errors.js';

type EmailProofClaims = { email: string; purpose: string };

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly generator: TokenGenerator,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async signAccessToken(
    payload: AccessTokenPayload,
  ): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = toSeconds(this.config.accessTtl);
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.secret,
      algorithm: 'HS256',
      expiresIn,
    });
    return { token, expiresIn };
  }

  issueRefreshToken(familyId?: string): IssuedRefreshToken {
    return {
      token: this.generator.opaqueToken(48),
      familyId: familyId ?? randomUUID(),
      expiresAt: new Date(
        Date.now() + toSeconds(this.config.refreshTtl) * 1000,
      ),
    };
  }

  async signEmailVerificationToken(
    email: string,
  ): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = toSeconds(this.config.emailVerificationTtl);
    const token = await this.jwt.signAsync(
      { email, purpose: 'email-verification' } satisfies EmailProofClaims,
      {
        secret: this.config.secret,
        algorithm: 'HS256',
        expiresIn,
      },
    );
    return { token, expiresIn };
  }

  async verifyEmailVerificationToken(token: string): Promise<string> {
    let claims: EmailProofClaims;

    try {
      claims = await this.jwt.verifyAsync<EmailProofClaims>(token, {
        secret: this.config.secret,
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw error instanceof Error && error.name === 'TokenExpiredError'
        ? new ExpiredTokenError()
        : new InvalidTokenError();
    }

    if (claims.purpose !== 'email-verification' || !claims.email)
      throw new InvalidTokenError();

    return claims.email;
  }
}

function toSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration: ${duration}`);

  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

  return value * multipliers[unit];
}
