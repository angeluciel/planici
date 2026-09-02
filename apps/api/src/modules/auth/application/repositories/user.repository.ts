import type { User } from '../../domain/user.entity.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type CreateUserData = {
  email: string;
  slug: string;
  name: string;
  surname: string;
  passwordHash: string | null;
  emailVerified: boolean;
  avatarUrl?: string | null;
};

export type ConsentData = {
  document: 'terms_of_service' | 'privacy_policy' | 'marketing';
  version: string;
  granted: boolean;
  acceptedAt: Date;
  ip: string | null;
  userAgent: string | null;
};

export type GoogleIdentityData = {
  providerAccountId: string;
  email: string | null;
};

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleAccountId(providerAccountId: string): Promise<User | null>;

  emailExists(email: string): Promise<boolean>;
  slugExists(slug: string): Promise<boolean>;

  /**
   * Creates the account, its consent rows, its id link
   */

  create(
    data: CreateUserData,
    consents: ConsentData[],
    identity?: GoogleIdentityData,
  ): Promise<User>;

  linkGoogleIdentity(
    userId: string,
    identity: GoogleIdentityData,
  ): Promise<void>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;
  markEmailVerifier(userId: string): Promise<void>;
  recordLogin(userId: string): Promise<void>;
}
