import {
	AvailabilityResponseSchema,
	TenantSlugAvailabilityQuerySchema,
} from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, parseInput, parseUpstream, route } from "../../_lib/http";
import { accessToken } from "../../_lib/session";

/** GET /api/tenants/availability?slug= */
export const GET = route(async (request) => {
	const query = parseInput(
		TenantSlugAvailabilityQuerySchema,
		Object.fromEntries(request.nextUrl.searchParams),
	);

	const result = await api(
		`/availability?${new URLSearchParams({ slug: query.slug })}`,
		{
			method: "GET",
			resource: "tenants",
			token: accessToken(request),
		},
	);

	return NextResponse.json(parseUpstream(AvailabilityResponseSchema, result));
});
