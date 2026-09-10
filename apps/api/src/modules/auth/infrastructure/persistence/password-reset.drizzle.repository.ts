import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.constants.js';
import type { Database } from '@/database/database.module.js';
import { passwordResetTokens } from '@/database/schema/index.js';
import type {
  PasswordResetRepository,
  PasswordResetToken,
} from '../../application/repositories/password-reset.repository.js';

@Injectable()
export class DrizzlePasswordResetRepository implements PasswordResetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async issue(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestIp: string | null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Requesting a new link invalidates the old one
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, userId),
            isNull(passwordResetTokens.consumedAt),
          ),
        );

      await tx
        .insert(passwordResetTokens)
        .values({ userId, tokenHash, expiresAt, requestIp });
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const [row] = await this.db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        consumedAt: passwordResetTokens.consumedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    return row ?? null;
  }

  async consume(id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }
}
