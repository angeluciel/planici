import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.constants.js';
import type { Database } from '@/database/database.module.js';
import { emailVerifications } from '@/database/schema/email-verifications.js';
import type {
  EmailVerification,
  EmailVerificationRepository,
} from '../../application/repositories/email-verification.repository.js';

@Injectable()
export class DrizzleEmailVerificationRepository implements EmailVerificationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async issue(
    email: string,
    codeHash: string,
    expiresAt: Date,
    requestIp: string | null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // only one code per addr
      await tx
        .update(emailVerifications)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(emailVerifications.email, email),
            isNull(emailVerifications.consumedAt),
          ),
        );

      await tx
        .insert(emailVerifications)
        .values({ email, codeHash, expiresAt, requestIp });
    });
  }

  async findActive(email: string): Promise<EmailVerification | null> {
    const [row] = await this.db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          isNull(emailVerifications.consumedAt),
        ),
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);

    return row ?? null;
  }

  async findLatest(email: string): Promise<EmailVerification | null> {
    const [row] = await this.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email))
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);

    return row ?? null;
  }

  async incrementAttempts(id: string): Promise<number> {
    const [row] = await this.db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts}+1` })
      .where(eq(emailVerifications.id, id))
      .returning({ attempts: emailVerifications.attempts });

    return row?.attempts ?? 0;
  }

  async consume(id: string): Promise<void> {
    await this.db
      .update(emailVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(emailVerifications.id, id));
  }
}
