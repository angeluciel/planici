import {
	CreateTenantRequestSchema,
	TenantListResponseSchema,
	TenantResponseSchema,
} from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, parseUpstream, readBody, route } from "../_lib/http";
import { accessToken } from "../_lib/session";
import { setActiveTenant } from "../_lib/tenant";

/** GET /api/tenants — the caller's workspaces; empty means onboarding. */
export const GET = route(async (request) => {
	const tenants = await api("", {
		method: "GET",
		resource: "tenants",
		token: accessToken(request),
	});

	return NextResponse.json(parseUpstream(TenantListResponseSchema, tenants));
});

/** POST /api/tenants — creates a workspace and makes it the active one. */
export const POST = route(async (request) => {
	const body = await readBody(request, CreateTenantRequestSchema);
	const created = await api("", {
		body,
		resource: "tenants",
		token: accessToken(request),
	});

	const tenant = parseUpstream(TenantResponseSchema, created);

	return setActiveTenant(
		request,
		NextResponse.json(tenant, { status: 201 }),
		tenant.id,
	);
});
