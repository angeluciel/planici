import { ServiceIdSchema } from "@planici/schemas";
import type { NextRequest } from "next/server";
import { ApiError, api } from "../../_lib/http";
import { accessToken } from "../../_lib/session";
import { requireActiveTenant } from "../../_lib/tenant";

// a malformed id names a service that cannot exist: 404, never a 400 or 422
export function serviceIdParam(value: string): string {
	const parsed = ServiceIdSchema.safeParse(value);
	if (!parsed.success) throw new ApiError(404, { error: "service.not-found" });
	return parsed.data;
}

// forwards to the API with the session token and the active tenant
export function servicesApi(
	request: NextRequest,
	path: string,
	options: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<unknown> {
	return api(path, {
		...options,
		resource: "services",
		token: accessToken(request),
		tenantId: requireActiveTenant(request),
	});
}
