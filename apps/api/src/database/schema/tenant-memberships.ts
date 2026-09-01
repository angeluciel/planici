import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { recordStatus } from "./enums";
import { tenants } from "./tenants";
import { users } from "./users";

/**
 * Link between a user and a workspace. In the MVP there is exactly one, with
 * `role = 'owner'`; the roles/permissions tables arrive with RF-05/RF-06.
 */
export const tenantMemberships = pgTable(
	"tenant_memberships",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),

		role: text("role").notNull().default("owner"),
		status: recordStatus("status").notNull().default("active"),

		joinedAt: timestamp("joined_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("idx_memberships_user_tenant").on(table.userId, table.tenantId),
		index("idx_memberships_tenant_id").on(table.tenantId),
		index("idx_memberships_user_id").on(table.userId),
	],
);

export type TenantMembershipRow = typeof tenantMemberships.$inferSelect;
