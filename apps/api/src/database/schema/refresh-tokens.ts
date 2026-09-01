import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Refresh token store, one row per issued token.
 *
 * Rotation: refreshing revokes the presented token and issues a new one in the
 * same `family_id`. Presenting an already-revoked token means it leaked, so the
 * whole family is revoked — that plus logout and password change is how "invalidação
 * de sessões ou tokens" (RFC 6.1) is enforced.
 */
export const refreshTokens = pgTable(
	"refresh_tokens",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		tokenHash: text("token_hash").notNull(),
		familyId: uuid("family_id").notNull(),

		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		/** Why it was revoked: 'rotated' | 'logout' | 'reuse-detected' | 'password-changed'. */
		revokedReason: text("revoked_reason"),

		userAgent: text("user_agent"),
		ip: text("ip"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("idx_refresh_tokens_token_hash").on(table.tokenHash),
		index("idx_refresh_tokens_user_id").on(table.userId),
		index("idx_refresh_tokens_family_id").on(table.familyId),
	],
);

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
