export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type IssuedRefreshToken = {
  token: string;
  familyId: string;
  expiresAt: Date;
};

export interface TokenService {
  signAccessToken(
    payload: AccessTokenPayload,
  ): Promise<{ token: string; expiresIn: number }>;

  issueRefreshToken(familyId?: string): IssuedRefreshToken;

  /** short-lived prrof that an address was verifired */
  signEmailVerificationToken(
    email: string,
  ): Promise<{ token: string; expiresIn: number }>;

  verifyEmailVerificationToken(token: string): Promise<string>;
}
