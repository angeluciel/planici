import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.constants.js';
import type { Database } from '@/database/database.module.js';
import {
  userConsents,
  userIdentities,
  users,
} from '@/database/schema/index.js';
import type {
  ConsentData,
  CreateUserData,
  GoogleIdentityData,
  UserRepository,
} from '../../application/repositories/user.repository.js';
import {
  EmailTakenError,
  SlugTakenError,
} from '../../domain/errors/auth.errors.js';
import type { User } from '../../domain/user.entity.js';
import { toDomain } from './user.mapper.js';

/** Postgres unique-violation */
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  async findByGoogleAccountId(providerAccountId: string): Promise<User | null> {
    const [row] = await this.db
      .select({ user: users })
      .from(userIdentities)
      .innerJoin(users, eq(users.id, userIdentities.userId))
      .where(
        and(
          eq(userIdentities.provider, 'google'),
          eq(userIdentities.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);

    return row ? toDomain(row.user) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return Boolean(row);
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1);

    return Boolean(row);
  }

  async create(
    data: CreateUserData,
    consents: ConsentData[],
    identity?: GoogleIdentityData,
  ): Promise<User> {
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            email: data.email,
            slug: data.slug,
            name: data.name,
            surname: data.surname,
            displayName: `${data.name} ${data.surname}`.trim(),
            avatarUrl: data.avatarUrl ?? null,
            passwordHash: data.passwordHash,
            emailVerifiedAt: data.emailVerified ? new Date() : null,
            passwordChangedAt: data.passwordHash ? new Date() : null,
          })
          .returning();

        if (!row) throw new Error('insert into users returned no row');

        if (consents.length > 0) {
          await tx.insert(userConsents).values(
            consents.map((consent) => ({
              userId: row.id,
              document: consent.document,
              version: consent.version,
              granted: consent.granted,
              acceptedAt: consent.acceptedAt,
              ip: consent.ip,
              userAgent: consent.userAgent,
            })),
          );
        }

        if (identity) {
          await tx.insert(userIdentities).values({
            userId: row.id,
            provider: 'google',
            providerAccountId: identity.providerAccountId,
            email: identity.email,
          });
        }

        return toDomain(row);
      });
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async linkGoogleIdentity(
    userId: string,
    identity: GoogleIdentityData,
  ): Promise<void> {
    await this.db
      .insert(userIdentities)
      .values({
        userId,
        provider: 'google',
        providerAccountId: identity.providerAccountId,
        email: identity.email,
      })
      .onConflictDoNothing();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async markEmailVerifier(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, userId), sql`${users.emailVerifiedAt} is null`));
  }

  async recordLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  private translateUniqueViolation(error: unknown): unknown {
    if (typeof error !== 'object' || error === null || !('code' in error))
      return error;
    if ((error as { code?: string }).code !== UNIQUE_VIOLATION) return error;

    const constraint = (error as { constraint?: string }).constraint ?? '';
    if (constraint.includes('slug')) return new SlugTakenError();
    if (constraint.includes('email')) return new EmailTakenError();

    return error;
  }
}
