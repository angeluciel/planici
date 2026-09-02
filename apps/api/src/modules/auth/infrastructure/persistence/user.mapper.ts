import type { UserRow } from '@/database/schema/users.js';
import { type UserStatus, User } from '../../domain/user.entity.js';

export function toDomain(row: UserRow): User {
  return User.fromProps({
    id: row.id,
    email: row.email,
    slug: row.slug,
    name: row.name,
    surname: row.surname,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    status: row.status as UserStatus,
    passwordHash: row.passwordHash,
    emailVerifiedAt: row.emailVerifiedAt,
    passwordChangedAt: row.passwordChangedAt,
    lastLoginAt: row.lastLoginAt,
  });
}
