export const EMAIL_VERIFICATION_REPOSITORY = Symbol(
  'EMAIL_VERIFICATION_REPOSITORY',
);

export type EmailVerification = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiredAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export interface EmailVerificationRepository {
  /** invalidates any code still outstanding for the address, stores new one */
  issue(
    email: string,
    codeHash: string,
    expiresAt: Date,
    requestIp: string | null,
  ): Promise<void>;

  /** unconsumed */
  findActive(email: string): Promise<EmailVerification | null>;

  /** regardless, used for resend cooldown */
  findLatest(email: string): Promise<EmailVerification | null>;

  incrementAttempts(id: string): Promise<number>;
  consume(id: string): Promise<void>;
}
