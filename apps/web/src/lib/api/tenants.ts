import {
	AvailabilityResponseSchema,
	CreateTenantRequestSchema,
	TENANT_SLUG_MAX_LENGTH,
	type Tenant,
	TenantListResponseSchema,
	TenantResponseSchema,
	TenantSlugAvailabilityQuerySchema,
	UpdateTenantRequestSchema,
} from "@planici/schemas";
import type { z } from "zod";
import { type ApiFailure, apiFailure, createSessionClient } from "./client";

export const tenantClient = createSessionClient("/api/tenants");

export type TenantResult = { ok: true; tenant: Tenant } | ApiFailure;
export type TenantListResult = { ok: true; tenants: Tenant[] } | ApiFailure;
export type SlugAvailabilityResult =
	| { ok: true; available: boolean }
	| ApiFailure;

function trimDashes(value: string): string {
	let start = 0;
	let end = value.length;
	while (start < end && value[start] === "-") start++;
	while (end > start && value[end - 1] === "-") end--;
	return value.slice(start, end);
}

function parsed<T>(schema: z.ZodType<T>, data: unknown): T | null {
	const result = schema.safeParse(data);
	return result.success ? result.data : null;
}

function asTenant(data: unknown): TenantResult {
	const tenant = parsed(TenantResponseSchema, data);
	return tenant ? { ok: true, tenant } : { ok: false, error: "unexpected" };
}

export async function createTenant(name: string): Promise<TenantResult> {
	try {
		const slug =
			trimDashes(
				trimDashes(
					name
						.normalize("NFKD")
						.replace(/[\u0300-\u036f]/g, "")
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-"),
				).slice(0, TENANT_SLUG_MAX_LENGTH),
			) || "organizacao";

		const body = CreateTenantRequestSchema.parse({ name, slug });

		try {
			const response = await tenantClient.post<unknown>("", body);
			return asTenant(response.data);
		} catch (error) {
			if (apiFailure(error).error !== "tenantSlug.taken") throw error;
		}

		const suffix = crypto.randomUUID().slice(0, 8);
		const prefix = trimDashes(
			slug.slice(0, TENANT_SLUG_MAX_LENGTH - suffix.length - 1),
		);
		const response = await tenantClient.post<unknown>("", {
			...body,
			slug: `${prefix}-${suffix}`,
		});
		return asTenant(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function listTenants(): Promise<TenantListResult> {
	try {
		const response = await tenantClient.get<unknown>("");
		const list = parsed(TenantListResponseSchema, response.data);
		return list
			? { ok: true, tenants: list.tenants }
			: { ok: false, error: "unexpected" };
	} catch (error) {
		return apiFailure(error);
	}
}

export async function checkTenantSlug(
	slug: string,
): Promise<SlugAvailabilityResult> {
	try {
		const params = TenantSlugAvailabilityQuerySchema.parse({ slug });
		const response = await tenantClient.get<unknown>("/availability", {
			params,
		});
		const result = parsed(AvailabilityResponseSchema, response.data);
		return result
			? { ok: true, ...result }
			: { ok: false, error: "unexpected" };
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getTenant(tenantId: string): Promise<TenantResult> {
	try {
		const response = await tenantClient.get<unknown>(
			`/${encodeURIComponent(tenantId)}`,
		);
		return asTenant(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function renameTenant(
	tenantId: string,
	name: string,
): Promise<TenantResult> {
	try {
		const body = UpdateTenantRequestSchema.parse({ name });
		const response = await tenantClient.patch<unknown>(
			`/${encodeURIComponent(tenantId)}`,
			body,
		);
		return asTenant(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function getActiveTenant(): Promise<TenantResult> {
	try {
		const response = await tenantClient.get<unknown>("/active");
		return asTenant(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function selectTenant(tenantId: string): Promise<TenantResult> {
	try {
		const response = await tenantClient.put<unknown>("/active", { tenantId });
		return asTenant(response.data);
	} catch (error) {
		return apiFailure(error);
	}
}

export async function clearActiveTenant(): Promise<void> {
	await tenantClient.delete("/active").catch(() => undefined);
}

export type TenantEntry =
	| { next: "onboarding" }
	| { next: "picker"; tenants: Tenant[] }
	| { next: "dashboard"; tenant: Tenant }
	| ApiFailure;

/**
 * Basically the workflow of user -> tenant:
 *  - No Workspace? -> onboarding (create one)
 *  - selection valid? -> dashboard
 */

export async function resolveTenantEntry(): Promise<TenantEntry> {
	const active = await getActiveTenant();
	if (active.ok) return { next: "dashboard", tenant: active.tenant };
	if (
		active.error !== "tenant.required" &&
		active.error !== "tenant.not-found" &&
		active.error !== "tenant.inactive"
	) {
		return active;
	}

	const list = await listTenants();
	if (!list.ok) return list;

	const usable = list.tenants.filter((tenant) => tenant.status === "active");
	if (list.tenants.length === 0) return { next: "onboarding" };
	if (usable.length === 1 && usable[0]) {
		const selected = await selectTenant(usable[0].id);
		return selected.ok
			? { next: "dashboard", tenant: selected.tenant }
			: selected;
	}

	return { next: "picker", tenants: list.tenants };
}
