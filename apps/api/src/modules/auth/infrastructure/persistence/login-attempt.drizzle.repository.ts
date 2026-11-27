import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { loginAttempts } from '@src/database/schema/login-attempts.js';
import type {
  LoginAttemptRepository,
  LoginAttemptState,
} from '../../ports/repositories/login-attempt.repository.js';
import { guardQuery } from './guard-query.js';

@Injectable()
export class DrizzleLoginAttemptRepository implements LoginAttemptRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async find(email: string): Promise<LoginAttemptState | null> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select({
          failures: loginAttempts.failures,
          lockedUntil: loginAttempts.lockedUntil,
        })
        .from(loginAttempts)
        .where(eq(loginAttempts.email, email))
        .limit(1);

      return row ?? null;
    });
  }

  async registerFailure(
    email: string,
    ip: string | null,
    maxFailures: number,
    lockoutMinutes: number,
  ): Promise<LoginAttemptState> {
    return guardQuery(async () => {
      const now = new Date();
      const lockExpression = sql`case
      when ${loginAttempts.failures} + 1 >= ${maxFailures}
      then ${now}::timestamptz + make_interval(mins => ${lockoutMinutes})
      else ${loginAttempts.lockedUntil}
    end`;

      const [row] = await this.db
        .insert(loginAttempts)
        .values({
          email,
          failures: 1,
          lastFailureAt: now,
          lastIp: ip,
          lockedUntil:
            maxFailures <= 1
              ? new Date(now.getTime() + lockoutMinutes * 60_000)
              : null,
        })
        .onConflictDoUpdate({
          target: loginAttempts.email,
          set: {
            failures: sql`${loginAttempts.failures} + 1`,
            lastFailureAt: now,
            lastIp: ip,
            lockedUntil: lockExpression,
            updatedAt: now,
          },
        })
        .returning({
          failures: loginAttempts.failures,
          lockedUntil: loginAttempts.lockedUntil,
        });

      return row ?? { failureas: 1, lockedUntil: null };
    });
  }

  async clear(email: string): Promise<void> {
    return guardQuery(async () => {
      await this.db.delete(loginAttempts).where(eq(loginAttempts.email, email));
    });
  }
}
