import { ClientIdSchema } from "@planici/schemas";
import type { NextRequest } from "next/server";
import { ApiError, api } from "../../_lib/http";
import { accessToken } from "../../_lib/session";
import { requireActiveTenant } from "../../_lib/tenant";

// a malformed id names a client that cannot exist: 404, never a 400 or 422
export function clientIdParam(value: string): string {
	const parsed = ClientIdSchema.safeParse(value);
	if (!parsed.success) throw new ApiError(404, { error: "client.not-found" });
	return parsed.data;
}

// forwards to the API with the session token and the active tenant
export function clientsApi(
	request: NextRequest,
	path: string,
	options: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<unknown> {
	return api(path, {
		...options,
		resource: "clients",
		token: accessToken(request),
		tenantId: requireActiveTenant(request),
	});
}
