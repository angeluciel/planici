import { afterEach, describe, expect, it, vi } from 'vitest';
import { authConfig } from './auth.config.js';

const VARIABLES = {
  BCRYPT_COST: 'bcryptCost',
  EMAIL_CODE_TTL_MINUTES: 'emailCodeTtlMinutes',
  EMAIL_CODE_MAX_ATTEMPTS: 'emailCodeMaxAttempts',
  EMAIL_CODE_RESEND_SECONDS: 'emailCodeResendSeconds',
  PASSWORD_RESET_TTL_MINUTES: 'passwordResetTtlMinutes',
  LOGIN_MAX_FAILURES: 'loginMaxFailures',
  LOGIN_LOCKOUT_MINUTES: 'loginLockoutMinutes',
} as const;

describe('authConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the env schema defaults when nothing is set', () => {
    for (const name of [...Object.keys(VARIABLES), 'GOOGLE_CLIENT_ID']) {
      vi.stubEnv(name, undefined);
    }

    expect(authConfig()).toEqual({
      bcryptCost: 12,
      emailCodeTtlMinutes: 15,
      emailCodeMaxAttempts: 5,
      emailCodeResendSeconds: 60,
      passwordResetTtlMinutes: 60,
      loginMaxFailures: 5,
      loginLockoutMinutes: 15,
      googleClientId: '',
    });
  });

  it.each(Object.entries(VARIABLES))('reads %s into %s', (name, key) => {
    vi.stubEnv(name, '42');

    expect(authConfig()).toMatchObject({ [key]: 42 });
  });

  it('reads GOOGLE_CLIENT_ID into googleClientId', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id.apps.googleusercontent.com');

    expect(authConfig().googleClientId).toBe(
      'client-id.apps.googleusercontent.com',
    );
  });
});
