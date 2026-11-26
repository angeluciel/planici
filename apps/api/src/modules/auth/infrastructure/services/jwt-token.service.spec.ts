import { describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { TokenGenerator } from '@shared/crypto/token.generator.js';
import {
  ExpiredTokenError,
  InvalidTokenError,
} from '../../domain/errors/auth.errors.js';
import { JwtTokenService } from './jwt-token.service.js';

// Real signing with @nestjs/jwt; the keys below exist only for this spec.

const SECRET = 'unit-test-signing-key-not-used-anywhere';
const jwt = new JwtService({});

function serviceWith(over: Partial<Record<string, string>> = {}) {
  return new JwtTokenService(jwt, new TokenGenerator(), {
    secret: SECRET,
    refreshSecret: 'unit-test-refresh-key',
    accessTtl: '15m',
    refreshTtl: '30d',
    emailVerificationTtl: '30m',
    ...over,
  });
}

const past = () => Math.floor(Date.now() / 1000) - 10;

describe('JwtTokenService', () => {
  describe('access tokens', () => {
    it('signs HS256 with the configured lifetime', async () => {
      const { token, expiresIn } = await serviceWith().signAccessToken({
        sub: 'user-1',
        email: 'pro@planici.co',
      });

      expect(expiresIn).toBe(900);
      const claims = await jwt.verifyAsync<{
        sub: string;
        exp: number;
        iat: number;
      }>(token, { secret: SECRET, algorithms: ['HS256'] });
      expect(claims.sub).toBe('user-1');
      expect(claims.exp - claims.iat).toBe(900);
    });

    it.each(['15 minutes', '15', '1w', ''])(
      'refuses the unsupported lifetime %j',
      async (accessTtl) => {
        await expect(
          serviceWith({ accessTtl }).signAccessToken({
            sub: 'user-1',
            email: 'pro@planici.co',
          }),
        ).rejects.toThrow(`Unsupported duration: ${accessTtl}`);
      },
    );
  });

  describe('refresh tokens', () => {
    it('starts a new family, or continues the one it is given', () => {
      const service = serviceWith();

      const first = service.issueRefreshToken();
      const rotated = service.issueRefreshToken(first.familyId);

      expect(rotated.familyId).toBe(first.familyId);
      expect(service.issueRefreshToken().familyId).not.toBe(first.familyId);
      expect(rotated.token).not.toBe(first.token);
    });

    it('expires after refreshTtl', () => {
      const before = Date.now();

      const { expiresAt } = serviceWith({
        refreshTtl: '2h',
      }).issueRefreshToken();

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7_200_000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7_200_000);
    });
  });

  describe('e-mail proof tokens', () => {
    it('round-trips the verified address', async () => {
      const service = serviceWith();
      const { token, expiresIn } =
        await service.signEmailVerificationToken('pro@planici.co');

      expect(expiresIn).toBe(1800);
      await expect(service.verifyEmailVerificationToken(token)).resolves.toBe(
        'pro@planici.co',
      );
    });

    it('answers token.expired for an expired proof', async () => {
      const token = await jwt.signAsync(
        { email: 'pro@planici.co', purpose: 'email-verification', exp: past() },
        { secret: SECRET, algorithm: 'HS256' },
      );

      await expect(
        serviceWith().verifyEmailVerificationToken(token),
      ).rejects.toBeInstanceOf(ExpiredTokenError);
    });

    it('will not take an access token as an e-mail proof', async () => {
      const { token } = await serviceWith().signAccessToken({
        sub: 'user-1',
        email: 'pro@planici.co',
      });

      await expect(
        serviceWith().verifyEmailVerificationToken(token),
      ).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it.each([
      [
        'signed with another key',
        () =>
          jwt.signAsync(
            { email: 'pro@planici.co', purpose: 'email-verification' },
            { secret: 'another-key', algorithm: 'HS256' },
          ),
      ],
      [
        'signed with another algorithm',
        () =>
          jwt.signAsync(
            { email: 'pro@planici.co', purpose: 'email-verification' },
            { secret: SECRET, algorithm: 'HS512' },
          ),
      ],
      [
        'with another purpose',
        () =>
          jwt.signAsync(
            { email: 'pro@planici.co', purpose: 'password-reset' },
            { secret: SECRET, algorithm: 'HS256' },
          ),
      ],
      [
        'without an address',
        () =>
          jwt.signAsync(
            { purpose: 'email-verification' },
            { secret: SECRET, algorithm: 'HS256' },
          ),
      ],
      ['that is not a JWT', () => Promise.resolve('not-a-token')],
    ])('answers token.invalid for a proof %s', async (_, make) => {
      await expect(
        serviceWith().verifyEmailVerificationToken(await make()),
      ).rejects.toBeInstanceOf(InvalidTokenError);
    });
  });
});
