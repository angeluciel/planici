import { sql } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { recordStatus } from "./enums";

/**
 * Account holder (the professional). One user per tenant in the MVP, with the
 * Owner role implied — RBAC is Pós-MVP (RFC 6.1).
 *
 * `password_hash` is nullable on purpose: a Google-only account never sets one
 * (RF-02), and `account.no-password` is returned if such a user tries the
 * e-mail/password form.
 */
export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		email: text("email").notNull(),
		/** Public handle, the "nickname" collected in the register stepper. */
		slug: text("slug").notNull(),

		name: text("name").notNull(),
		surname: text("surname").notNull(),
		displayName: text("display_name"),
		avatarUrl: text("avatar_url"),

		status: recordStatus("status").notNull().default("active"),

		passwordHash: text("password_hash"),
		emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
		passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
		lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

		preferences: jsonb("preferences").notNull().default({}),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		// Emails and slugs are normalised to lower case before they reach the
		// database (EmailSchema, SLUG_PATTERN), so a plain unique index is enough.
		uniqueIndex("idx_users_email").on(table.email),
		uniqueIndex("idx_users_slug").on(table.slug),
	],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
