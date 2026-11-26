import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ExpiredTokenError,
  InvalidTokenError,
} from '../domain/errors/auth.errors.js';
import type { AuthenticatedUser } from './current-user.decorator.js';
import { JwtAccessGuard } from './jwt-access.guard.js';

// Real verification with @nestjs/jwt; the key below exists only for this spec.

const SECRET = 'unit-test-signing-key-not-used-anywhere';
const jwt = new JwtService({});
const guard = new JwtAccessGuard(jwt, {
  secret: SECRET,
  refreshSecret: 'unit-test-refresh-key',
  accessTtl: '15m',
  refreshTtl: '30d',
  emailVerificationTtl: '30m',
});

function requestWith(authorization?: string) {
  const request: {
    user?: AuthenticatedUser;
    header: (name: string) => string | undefined;
  } = {
    header: (name) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

const sign = (
  claims: object,
  options: { secret?: string; algorithm?: 'HS256' | 'HS512' } = {},
) =>
  jwt.signAsync(claims, {
    secret: options.secret ?? SECRET,
    algorithm: options.algorithm ?? 'HS256',
  });

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JwtAccessGuard', () => {
  it('lets a valid bearer token through and sets the caller on the request', async () => {
    const token = await sign({ sub: 'user-1', email: 'pro@planici.co' });
    const { request, context } = requestWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'pro@planici.co' });
  });

  it.each([
    ['no Authorization header', undefined],
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['a lowercase scheme', 'bearer abc'],
    ['an empty bearer', 'Bearer '],
  ])('answers token.invalid for %s', async (_, header) => {
    const { request, context } = requestWith(header);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    expect(request.user).toBeUndefined();
  });

  it('answers token.expired for an expired token, so the web app refreshes', async () => {
    const token = await sign({
      sub: 'user-1',
      email: 'pro@planici.co',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    const { request, context } = requestWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ExpiredTokenError,
    );
    expect(request.user).toBeUndefined();
  });

  it.each([
    [
      'signed with another key',
      () => sign({ sub: 'user-1', email: 'x' }, { secret: 'another-key' }),
    ],
    [
      'signed with another algorithm',
      () => sign({ sub: 'user-1', email: 'x' }, { algorithm: 'HS512' }),
    ],
    [
      'with alg none',
      () =>
        Promise.resolve(
          `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: 'user-1', email: 'x' })}.`,
        ),
    ],
  ])('answers token.invalid for a token %s', async (_, make) => {
    const { request, context } = requestWith(`Bearer ${await make()}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    expect(request.user).toBeUndefined();
  });
});
