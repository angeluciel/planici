export const TENANT_ERROR_CODES = [
	"tenantName.required",
	"tenantName.max",
	"tenantSlug.required",
	"tenantSlug.max",
	"tenantSlug.pattern",
	"tenantSlug.taken",

	// active workspace resolution (X-Tenant-Id)
	"tenant.required",
	"tenant.not-found",
	"tenant.inactive",
	"tenant.forbidden",
] as const;

export type TenantErrorCode = (typeof TENANT_ERROR_CODES)[number];
