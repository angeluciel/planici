import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import {
  GoogleInvalidTokenError,
  GoogleUnavailableError,
} from '../../domain/errors/auth.errors.js';
import { GoogleTokenVerifier } from './google-token.verifier.js';

// Google itself is never called: OAuth2Client.verifyIdToken is replaced.

const CLIENT_ID = 'planici-test.apps.googleusercontent.com';

function verifierWith(googleClientId = CLIENT_ID) {
  return new GoogleTokenVerifier({
    bcryptCost: 4,
    emailCodeTtlMinutes: 15,
    emailCodeMaxAttempts: 5,
    emailCodeResendSeconds: 60,
    passwordResetTtlMinutes: 60,
    loginMaxFailures: 5,
    loginLockoutMinutes: 15,
    googleClientId,
  });
}

function googleAnswers(payload: TokenPayload | undefined) {
  return vi
    .spyOn(OAuth2Client.prototype, 'verifyIdToken')
    .mockImplementation((() =>
      Promise.resolve({
        getPayload: () => payload,
      })) as unknown as OAuth2Client['verifyIdToken']);
}

const PAYLOAD = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  iat: 0,
  exp: 0,
  sub: 'google-sub-1',
  email: 'Ana.Souza@Gmail.com',
  email_verified: true,
  given_name: 'Ana',
  family_name: 'Souza',
  picture: 'https://example.com/ana.png',
} satisfies TokenPayload;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GoogleTokenVerifier', () => {
  it('checks the token against this app client id as the audience', async () => {
    const verify = googleAnswers(PAYLOAD);

    await verifierWith().verify('id-token');

    expect(verify).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: CLIENT_ID,
    });
  });

  it('maps the payload, lowercasing the e-mail', async () => {
    googleAnswers(PAYLOAD);

    await expect(verifierWith().verify('id-token')).resolves.toEqual({
      providerAccountId: 'google-sub-1',
      email: 'ana.souza@gmail.com',
      emailVerified: true,
      givenName: 'Ana',
      familyName: 'Souza',
      picture: 'https://example.com/ana.png',
    });
  });

  it.each([
    ['false', false],
    ['absent', undefined],
  ])('treats email_verified %s as unverified', async (_, emailVerified) => {
    googleAnswers({ ...PAYLOAD, email_verified: emailVerified });

    const account = await verifierWith().verify('id-token');

    expect(account.emailVerified).toBe(false);
  });

  it('answers google.unavailable without calling Google when no client id is configured', async () => {
    const verify = googleAnswers(PAYLOAD);

    await expect(verifierWith('').verify('id-token')).rejects.toBeInstanceOf(
      GoogleUnavailableError,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('answers google.invalid, not Google own error, when verification fails', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation((() =>
      Promise.reject(
        new Error('Wrong recipient, payload audience != requiredAudience'),
      )) as unknown as OAuth2Client['verifyIdToken']);

    const error = await verifierWith()
      .verify('id-token')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GoogleInvalidTokenError);
    expect((error as Error).message).not.toContain('audience');
  });

  it.each([
    ['no payload', undefined],
    ['no subject', { ...PAYLOAD, sub: '' }],
    ['no e-mail', { ...PAYLOAD, email: undefined }],
  ])('answers google.invalid for a token with %s', async (_, payload) => {
    googleAnswers(payload);

    await expect(verifierWith().verify('id-token')).rejects.toBeInstanceOf(
      GoogleInvalidTokenError,
    );
  });
});
