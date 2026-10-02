import { z } from "zod";
import { SLUG_PATTERN } from "../auth/register.js";

export const TENANT_NAME_MAX_LENGTH = 80;
export const TENANT_SLUG_MAX_LENGTH = 48;

// `<slug>-<nanoid suffix>`, e.g. studio-ana-4f9k2m7x1q; the API generates it on insert
export const TENANT_ID_SUFFIX_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
export const TENANT_ID_SUFFIX_LENGTH = 10;
export const TENANT_ID_MAX_LENGTH = TENANT_SLUG_MAX_LENGTH + 1 + TENANT_ID_SUFFIX_LENGTH;
export const TENANT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-z]{10}$/;

// /tenants/:tenantId, X-Tenant-Id, PUT /tenants/active
export const TenantIdSchema = z
	.string({ error: "tenant.not-found" })
	.max(TENANT_ID_MAX_LENGTH, { error: "tenant.not-found" })
	.regex(TENANT_ID_PATTERN, { error: "tenant.not-found" });

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
