import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { recordStatus } from './enums.js';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    role: text('role').notNull().default('owner'),
    status: recordStatus('status').notNull().default('active'),

    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_memberships_user_tenant').on(table.userId, table.tenantId),
    index('idx_memberships_tenant_id').on(table.tenantId),
    index('idx_memberships_user_id').on(table.userId),
  ],
);

export type TenantMembershipRow = typeof tenantMemberships.$inferSelect;
