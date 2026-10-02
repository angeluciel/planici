import { TenantIdSchema } from "@planici/schemas";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./http";
import { cookieOptions, REMEMBER_COOKIE, TENANT_COOKIE } from "./session";

export function activeTenantId(request: NextRequest): string | null {
	const value = request.cookies.get(TENANT_COOKIE)?.value;
	const parsed = TenantIdSchema.safeParse(value);

	return parsed.success ? parsed.data : null;
}

export function requireActiveTenant(request: NextRequest): string {
	const tenantId = activeTenantId(request);

	if (!tenantId) {
		throw new ApiError(400, { error: "tenant.required" });
	}

	return tenantId;
}

export function setActiveTenant(
	request: NextRequest,
	response: NextResponse,
	tenantId: string,
): NextResponse {
	const persistent = request.cookies.get(REMEMBER_COOKIE)?.value === "1";

	response.cookies.set(TENANT_COOKIE, tenantId, {
		...cookieOptions(),
		...(persistent ? { maxAge: 60 * 60 * 24 * 365 } : {}),
	});

	return response;
}

export function clearActiveTenant(response: NextResponse): NextResponse {
	response.cookies.set(TENANT_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
	return response;
}

export function tenantIdParam(value: string): string {
	const parsed = TenantIdSchema.safeParse(value);

	if (!parsed.success) {
		throw new ApiError(404, { error: "tenant.not-found" });
	}

	return parsed.data;
}
