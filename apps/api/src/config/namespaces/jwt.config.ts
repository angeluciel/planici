import { registerAs } from '@nestjs/config';

/**
 * `secret` is shared with apps/web
 * */

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET as string,
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  emailVerificationTtl: process.env.JWT_EMAIL_VERIFICATION_TTL ?? '30m',
}));
