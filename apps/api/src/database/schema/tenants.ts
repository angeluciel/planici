import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { recordStatus, tenantPlan } from "./enums";

/**
 * Workspace. Created during onboarding (RF-04a) — the tenant module owns that
 * flow; the table lives here because every operational row references it (RN-02).
 */
export const tenants = pgTable(
	"tenants",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		status: recordStatus("status").notNull().default("active"),

		plan: tenantPlan("plan").notNull().default("free"),
		trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),

		usage: jsonb("usage").notNull().default({}),
		limits: jsonb("limits").notNull().default({}),
		settings: jsonb("settings").notNull().default({}),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("idx_tenants_slug").on(table.slug),
		index("idx_tenants_status").on(table.status),
	],
);

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
