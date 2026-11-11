import { FormIdSchema, FormVersionParamSchema } from "@planici/schemas";
import type { NextRequest } from "next/server";
import { ApiError, api } from "../../_lib/http";
import { accessToken } from "../../_lib/session";
import { requireActiveTenant } from "../../_lib/tenant";

// a malformed id is a missing template, never a 400 (SPEC-0001 contracts)
export function formIdParam(value: string): string {
	const parsed = FormIdSchema.safeParse(value);
	if (!parsed.success) throw new ApiError(404, { error: "form.not-found" });
	return parsed.data;
}

export function versionParam(value: string): number {
	const parsed = FormVersionParamSchema.safeParse(value);
	if (!parsed.success) {
		throw new ApiError(404, { error: "formVersion.not-found" });
	}
	return parsed.data;
}

// forwards to the API with the session token and the active tenant
export function formsApi(
	request: NextRequest,
	path: string,
	options: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<unknown> {
	return api(path, {
		...options,
		resource: "forms",
		token: accessToken(request),
		tenantId: requireActiveTenant(request),
	});
}
