import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { authProvider } from "./enums";
import { users } from "./users";

/** External sign-in links — Google in the MVP (RF-02). */
export const userIdentities = pgTable(
	"user_identities",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		provider: authProvider("provider").notNull(),
		/** `sub` from the provider's id token. */
		providerAccountId: text("provider_account_id").notNull(),
		email: text("email"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("idx_identities_provider_account").on(
			table.provider,
			table.providerAccountId,
		),
		index("idx_identities_user_id").on(table.userId),
	],
);

export type UserIdentityRow = typeof userIdentities.$inferSelect;
