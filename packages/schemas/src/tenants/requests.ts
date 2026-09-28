import { z } from "zod";
import { SLUG_PATTERN } from "../auth/register.js";

export const TENANT_NAME_MAX_LENGTH = 80;
export const TENANT_SLUG_MAX_LENGTH = 48;

export const TenantNameSchema = z
	.string({ error: "tenantName.required" })
	.trim()
	.min(1, { error: "tenantName.required" })
	.max(TENANT_NAME_MAX_LENGTH, { error: "tenantName.max" });

export const TenantSlugSchema = z
	.string({ error: "tenantSlug.required" })
	.trim()
	.toLowerCase()
	.min(1, { error: "tenantSlug.required" })
	.max(TENANT_SLUG_MAX_LENGTH, { error: "tenantSlug.max" })
	.regex(SLUG_PATTERN, { error: "tenantSlug.pattern" });

// POST /tenants
export const CreateTenantRequestSchema = z.object({
	name: TenantNameSchema,
	slug: TenantSlugSchema,
});

// PATCH /tenants/:tenantId
export const UpdateTenantRequestSchema = z.object({
	name: TenantNameSchema,
});

// GET /tenants/availability?slug=
export const TenantSlugAvailabilityQuerySchema = z.object({
	slug: TenantSlugSchema,
});

export type CreateTenantRequestInput = z.infer<typeof CreateTenantRequestSchema>;
export type UpdateTenantRequestInput = z.infer<typeof UpdateTenantRequestSchema>;
export type TenantSlugAvailabilityQuery = z.infer<typeof TenantSlugAvailabilityQuerySchema>;
