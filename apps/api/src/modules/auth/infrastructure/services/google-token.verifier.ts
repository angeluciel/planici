import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { authConfig } from '@/config/namespaces/auth.config.js';
import type {
  GoogleAccount,
  GoogleVerifier,
} from '../../application/services/google-verifier.js';
import {
  GoogleInvalidTokenError,
  GoogleUnavailableError,
} from '../../domain/errors/auth.errors.js';

@Injectable()
export class GoogleTokenVerifier implements GoogleVerifier {
  private readonly client: OAuth2Client;

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {
    this.client = new OAuth2Client(config.googleClientId);
  }

  async verify(idToken: string): Promise<GoogleAccount> {
    if (!this.config.googleClientId) throw new GoogleUnavailableError();

    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new GoogleInvalidTokenError();
    }

    if (!payload?.sub || !payload.email) throw new GoogleInvalidTokenError();

    return {
      providerAccountId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      givenName: payload.given_name ?? null,
      familyName: payload.family_name ?? null,
      picture: payload.picture ?? null,
    };
  }
}
