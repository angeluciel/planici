export const LOGIN_ATTEMPT_REPOSITORY = Symbol('LOGIN_ATTEMPT_REPOSITORY');

export type LoginAttemptState = {
  failures: number;
  lockedUntil: Date | null;
};

export interface LoginAttemptRepository {
  find(email: string): Promise<LoginAttemptState | null>;
  /** Returns the state after the increment, so the caller can lock in one round trip. */
  registerFailure(
    email: string,
    ip: string | null,
    maxFailures: number,
    lockoutMinutes: number,
  ): Promise<LoginAttemptState>;
  clear(email: string): Promise<void>;
}
