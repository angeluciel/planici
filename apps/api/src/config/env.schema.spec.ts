import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema.js';

/** Minimal set of required-with-no-default env vars, valid for any NODE_ENV. */
function baseEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgres://owner:owner@localhost:5432/planici',
    JWT_SECRET: 'a'.repeat(16),
    JWT_REFRESH_SECRET: 'b'.repeat(16),
    OBSERVE_APP_KEY: 'key',
    OBSERVE_APP_SECRET: 'secret',
    ...overrides,
  };
}

describe('env.schema — DATABASE_URL_APP fail-closed (JOA-19 AC6 follow-up)', () => {
  it('rejects boot when NODE_ENV=production and DATABASE_URL_APP is unset', () => {
    expect(() => validateEnv(baseEnv({ NODE_ENV: 'production' }))).toThrow(
      /DATABASE_URL_APP/,
    );
  });

  it('accepts boot when NODE_ENV=production and DATABASE_URL_APP is set', () => {
    const env = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        DATABASE_URL_APP: 'postgres://app:app@localhost:5432/planici',
      }),
    );

    expect(env.NODE_ENV).toBe('production');
    expect(env.DATABASE_URL_APP).toBe(
      'postgres://app:app@localhost:5432/planici',
    );
  });

  it('allows DATABASE_URL_APP to be unset outside production (development)', () => {
    const env = validateEnv(baseEnv({ NODE_ENV: 'development' }));

    expect(env.DATABASE_URL_APP).toBeUndefined();
  });

  it('allows DATABASE_URL_APP to be unset outside production (test)', () => {
    const env = validateEnv(baseEnv({ NODE_ENV: 'test' }));

    expect(env.DATABASE_URL_APP).toBeUndefined();
  });
});
