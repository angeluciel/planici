import {
	TenantResponseSchema,
	UpdateTenantRequestSchema,
} from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, parseUpstream, readBody, route } from "../../_lib/http";
import { accessToken } from "../../_lib/session";
import { tenantIdParam } from "../../_lib/tenant";

type Context = { params: Promise<{ tenantId: string }> };

// GET /api/tenants/:tenantId
export const GET = route<Context>(async (request, { params }) => {
	const tenantId = tenantIdParam((await params).tenantId);

	const tenant = await api(`/${tenantId}`, {
		method: "GET",
		resource: "tenants",
		token: accessToken(request),
	});

	return NextResponse.json(parseUpstream(TenantResponseSchema, tenant));
});

// PATCH /api/tenants/:tenantId
// owner rename tenant
export const PATCH = route<Context>(async (request, { params }) => {
	const tenantId = tenantIdParam((await params).tenantId);
	const body = await readBody(request, UpdateTenantRequestSchema);

	const tenant = await api(`/${tenantId}`, {
		method: "PATCH",
		body,
		resource: "tenants",
		token: accessToken(request),
	});

	return NextResponse.json(parseUpstream(TenantResponseSchema, tenant));
});
