export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type StoredRefreshToken = {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type RefreshTokenContext = {
  ip: string | null;
  userAgent: string | null;
};

export type RevokeReason =
  'rotated' | 'logout' | 'reuse-detected' | 'password-changed';

export interface RefreshTokenRepository {
  store(
    userId: string,
    tokenHash: string,
    familyId: string,
    expiresAt: Date,
    context: RefreshTokenContext,
  ): Promise<void>;

  findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null>;

  revoke(id: string, reason: RevokeReason): Promise<void>;
  /** Reuse of a rotated token means the family leaked: drop all of it. */
  revokeFamily(familyId: string, reason: RevokeReason): Promise<void>;
  /** Password change and account-wide logout */
  revokeAllForUser(userId: string, reason: RevokeReason): Promise<void>;
}
