import { pgEnum } from "drizzle-orm/pg-core";

/** Mirrors `docs/schema.dbml`. */
export const recordStatus = pgEnum("record_status", [
	"active",
	"suspended",
	"deleted",
]);

export const tenantPlan = pgEnum("tenant_plan", ["free", "pro", "enterprise"]);

/** Identity providers a user can sign in with (RF-01/RF-02). */
export const authProvider = pgEnum("auth_provider", ["email", "google"]);

/** Documents a user can accept, versioned for RNF-12. */
export const consentDocument = pgEnum("consent_document", [
	"terms_of_service",
	"privacy_policy",
	"marketing",
]);
