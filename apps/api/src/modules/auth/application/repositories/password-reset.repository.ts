export const PASSWORD_RESET_REPOSITORY = Symbol('PASSWORD_RESET_REPOSITORY');

export type PasswordResetToken = {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export interface PasswordResetRepository {
  /** Issuing a new token invalidates the user's outstanding ones. */
  issue(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestIp: string | null,
  ): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  consume(id: string): Promise<void>;
}
