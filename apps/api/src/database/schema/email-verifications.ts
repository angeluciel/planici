import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * One-time codes for the "confirm e-mail" step of registration.
 *
 * Keyed by e-mail rather than by user: the register stepper verifies the
 * address *before* the account exists (account → verify → password → terms →
 * profile, see apps/web/src/lib/register-flow.ts).
 *
 * Only the SHA-256 of the code is stored — a database leak must not hand out
 * working codes (RFC 6.1, "Dados Sensíveis e Credenciais").
 */
export const emailVerifications = pgTable(
	"email_verifications",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		email: text("email").notNull(),
		codeHash: text("code_hash").notNull(),

		attempts: integer("attempts").notNull().default(0),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),

		requestIp: text("request_ip"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("idx_email_verifications_email").on(table.email),
		index("idx_email_verifications_expires_at").on(table.expiresAt),
	],
);

export type EmailVerificationRow = typeof emailVerifications.$inferSelect;
