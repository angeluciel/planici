import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.constants.js';
import type { Database } from '@/database/database.module.js';
import type {
  RefreshTokenContext,
  RefreshTokenRepository,
  RevokeReason,
  StoredRefreshToken,
} from '../../application/repositories/refresh-token.repository.js';
import { refreshTokens } from '@/database/schema/index.js';

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async store(
    userId: string,
    tokenHash: string,
    familyId: string,
    expiresAt: Date,
    context: RefreshTokenContext,
  ): Promise<void> {
    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      familyId,
      expiresAt,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const [row] = await this.db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return row ?? null;
  }

  async revoke(id: string, reason: RevokeReason): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  }

  async revokeFamily(familyId: string, reason: RevokeReason): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: string, reason: RevokeReason): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}
