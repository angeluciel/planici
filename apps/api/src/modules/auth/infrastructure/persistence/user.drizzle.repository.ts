import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import {
  userConsents,
  userIdentities,
  users,
} from '@src/database/schema/index.js';
import type {
  ConsentData,
  CreateUserData,
  GoogleIdentityData,
  UserRepository,
} from '../../ports/repositories/user.repository.js';
import {
  AuthPersistenceError,
  EmailTakenError,
  SlugTakenError,
} from '../../domain/errors/auth.errors.js';
import type { User } from '../../domain/user.entity.js';
import { guardQuery, pgErrorOf } from './guard-query.js';
import { toDomain } from './user.mapper.js';

/** Postgres unique-violation */
const UNIQUE_VIOLATION = '23505';
const EMAIL_INDEX = 'idx_users_email';
const SLUG_INDEX = 'idx_users_slug';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return row ? toDomain(row) : null;
    });
  }

  async findById(id: string): Promise<User | null> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return row ? toDomain(row) : null;
    });
  }

  async findByGoogleAccountId(providerAccountId: string): Promise<User | null> {
    return guardQuery(async () => {
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
    });
  }

  async emailExists(email: string): Promise<boolean> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return Boolean(row);
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.slug, slug))
        .limit(1);

      return Boolean(row);
    });
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
      throw translateCreateError(error);
    }
  }

  async linkGoogleIdentity(
    userId: string,
    identity: GoogleIdentityData,
  ): Promise<void> {
    return guardQuery(async () => {
      await this.db
        .insert(userIdentities)
        .values({
          userId,
          provider: 'google',
          providerAccountId: identity.providerAccountId,
          email: identity.email,
        })
        .onConflictDoNothing();
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    return guardQuery(async () => {
      await this.db
        .update(users)
        .set({
          passwordHash,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });
  }

  async markEmailVerifier(userId: string): Promise<void> {
    return guardQuery(async () => {
      await this.db
        .update(users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(users.id, userId), sql`${users.emailVerifiedAt} is null`),
        );
    });
  }

  async recordLogin(userId: string): Promise<void> {
    return guardQuery(async () => {
      await this.db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));
    });
  }
}

/**
 * A taken e-mail or slug is a 409 (the register pre-checks lost a race). Drizzle
 * wraps the driver error, so the Postgres code sits on `cause` (`pgErrorOf`).
 * Anything else becomes `AuthPersistenceError`: Drizzle's message carries the
 * query parameters, which hold personal data and the password hash.
 */
function translateCreateError(error: unknown): Error {
  const { code, constraint } = pgErrorOf(error);

  if (code === UNIQUE_VIOLATION && constraint === EMAIL_INDEX)
    return new EmailTakenError();
  if (code === UNIQUE_VIOLATION && constraint === SLUG_INDEX)
    return new SlugTakenError();

  return new AuthPersistenceError(code, constraint);
}
