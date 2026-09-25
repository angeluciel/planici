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

describe('env.schema — NODE_ENV fail-closed (JOA-19 review N1)', () => {
  it('rejects boot when NODE_ENV is missing', () => {
    expect(() => validateEnv(baseEnv())).toThrow(/NODE_ENV/);
  });

  it('accepts NODE_ENV=prod and normalizes it to production', () => {
    const env = validateEnv(
      baseEnv({
        NODE_ENV: 'prod',
        DATABASE_URL_APP: 'postgres://app:app@localhost:5432/planici',
      }),
    );

    expect(env.NODE_ENV).toBe('production');
  });

  it('accepts NODE_ENV=production as-is', () => {
    const env = validateEnv(
      baseEnv({
        NODE_ENV: 'production',
        DATABASE_URL_APP: 'postgres://app:app@localhost:5432/planici',
      }),
    );

    expect(env.NODE_ENV).toBe('production');
  });

  it('rejects an invalid NODE_ENV value', () => {
    expect(() => validateEnv(baseEnv({ NODE_ENV: 'staging' }))).toThrow(
      /NODE_ENV/,
    );
  });

  it('rejects AWS_LAMBDA_FUNCTION_NAME set with NODE_ENV=development', () => {
    expect(() =>
      validateEnv(
        baseEnv({
          NODE_ENV: 'development',
          AWS_LAMBDA_FUNCTION_NAME: 'planici-api',
        }),
      ),
    ).toThrow(/AWS_LAMBDA_FUNCTION_NAME is set/);
  });

  it('accepts AWS_LAMBDA_FUNCTION_NAME set with NODE_ENV=prod (normalized to production)', () => {
    const env = validateEnv(
      baseEnv({
        NODE_ENV: 'prod',
        AWS_LAMBDA_FUNCTION_NAME: 'planici-api',
        DATABASE_URL_APP: 'postgres://app:app@localhost:5432/planici',
      }),
    );

    expect(env.NODE_ENV).toBe('production');
    expect(env.AWS_LAMBDA_FUNCTION_NAME).toBe('planici-api');
  });
});
