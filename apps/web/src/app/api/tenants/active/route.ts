import { TenantResponseSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	ApiError,
	api,
	errorResponse,
	parseUpstream,
	readBody,
	route,
} from "../../_lib/http";
import { accessToken } from "../../_lib/session";
import {
	activeTenantId,
	clearActiveTenant,
	setActiveTenant,
} from "../../_lib/tenant";

const SelectTenantSchema = z.object({
	tenantId: z.uuid({ error: "tenant.not-found" }),
});

function isStale(error: unknown): boolean {
	return error instanceof ApiError && [403, 404].includes(error.status);
}

// GET /api/tenants/active
export const GET = route(async (request) => {
	const token = accessToken(request);
	const tenantId = activeTenantId(request);

	if (!tenantId) {
		throw new ApiError(400, { error: "tenant.required" });
	}

	try {
		const tenant = await api(`/${tenantId}`, {
			method: "GET",
			resource: "tenants",
			token,
		});

		return NextResponse.json(parseUpstream(TenantResponseSchema, tenant));
	} catch (error) {
		if (isStale(error)) return clearActiveTenant(errorResponse(error));
		throw error;
	}
});

// PUT /api/tenants/active
export const PUT = route(async (request) => {
	const { tenantId } = await readBody(request, SelectTenantSchema);

	const upstream = await api(`/${tenantId}`, {
		method: "GET",
		resource: "tenants",
		token: accessToken(request),
	});

	const tenant = parseUpstream(TenantResponseSchema, upstream);

	return setActiveTenant(request, NextResponse.json(tenant), tenant.id);
});

// DELETE /api/tenants/active
export const DELETE = route(async () =>
	clearActiveTenant(new NextResponse(null, { status: 204 })),
);
