import { z } from "zod";

export const TENANT_STATUSES = ["active", "suspended", "deleted"] as const;
export const TENANT_PLANS = ["free", "pro", "enterprise"] as const;
export const TENANT_ROLES = ["owner"] as const;

export const TenantSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	status: z.enum(TENANT_STATUSES),
	plan: z.enum(TENANT_PLANS),
	role: z.enum(TENANT_ROLES),
	trialStartedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
});

// GET /tenants
export const TenantListResponseSchema = z.object({
	tenants: z.array(TenantSchema),
});

// POST /tenants, GET /tenants/:tenantId, PATCH /tenants/:tenantId
export const TenantResponseSchema = TenantSchema;

export type TenantStatus = (typeof TENANT_STATUSES)[number];
export type TenantPlan = (typeof TENANT_PLANS)[number];
export type TenantRole = (typeof TENANT_ROLES)[number];
export type Tenant = z.infer<typeof TenantSchema>;
export type TenantResponse = z.infer<typeof TenantResponseSchema>;
export type TenantListResponse = z.infer<typeof TenantListResponseSchema>;
