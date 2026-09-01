import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Single-use, expiring password reset tokens (RF-03, RFC 6.1: "não devem ser
 * reutilizáveis após o uso"). The raw token only ever exists in the e-mail.
 */
export const passwordResetTokens = pgTable(
	"password_reset_tokens",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),

		requestIp: text("request_ip"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("idx_password_reset_user_id").on(table.userId),
		index("idx_password_reset_token_hash").on(table.tokenHash),
	],
);

export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
