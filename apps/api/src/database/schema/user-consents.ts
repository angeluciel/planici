import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { consentDocument } from "./enums";
import { users } from "./users";

/**
 * Traceable record of what the user accepted (RNF-12, RFC 6.2): user, document,
 * version, timestamp and IP. Append-only — a later acceptance adds a row rather
 * than overwriting one, so the trail survives.
 */
export const userConsents = pgTable(
	"user_consents",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		document: consentDocument("document").notNull(),
		version: text("version").notNull(),
		/** Marketing consent (art. 7, I) is revocable — a revocation is a new row with granted = false. */
		granted: boolean("granted").notNull().default(true),

		acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
		ip: text("ip"),
		userAgent: text("user_agent"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("idx_user_consents_user_id").on(table.userId, table.document),
	],
);

export type UserConsentRow = typeof userConsents.$inferSelect;
