import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Per-account failure counter behind the progressive lockout described in
 * RFC 6.1 ("lockout progressivo por conta"), which the per-IP throttler cannot
 * provide on its own against distributed credential stuffing.
 *
 * Keyed by e-mail, not user id, so attempts against a non-existent account are
 * counted too — otherwise the lockout itself becomes an enumeration oracle.
 */
export const loginAttempts = pgTable(
	"login_attempts",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		email: text("email").notNull(),

		failures: integer("failures").notNull().default(0),
		lockedUntil: timestamp("locked_until", { withTimezone: true }),
		lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
		lastIp: text("last_ip"),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("idx_login_attempts_email").on(table.email),
		index("idx_login_attempts_locked_until").on(table.lockedUntil),
	],
);

export type LoginAttemptRow = typeof loginAttempts.$inferSelect;
