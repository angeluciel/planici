import { ServiceListResponseSchema, ServiceSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../_lib/http";
import { servicesApi } from "./_lib/services";

// GET /api/services?q&status&formId&sort&limit&after
// the API validates the query (422 serviceSearch.min, serviceStatus.invalid, serviceSort.invalid, formId.invalid,
// limit.invalid, cursor.invalid); nothing else is forwarded
export const GET = route(async (request) => {
	const incoming = request.nextUrl.searchParams;
	const query = new URLSearchParams();

	for (const key of ["q", "status", "formId", "sort", "limit", "after"]) {
		const value = incoming.get(key);
		if (value !== null) query.set(key, value);
	}

	const suffix = query.size > 0 ? `?${query.toString()}` : "";
	const list = await servicesApi(request, suffix, { method: "GET" });

	return NextResponse.json(parseUpstream(ServiceListResponseSchema, list));
});

// POST /api/services
// the body is forwarded as is: the API answers 422 with the field
export const POST = route(async (request) => {
	const body = await readBody(request, z.unknown());
	const service = await servicesApi(request, "", { method: "POST", body });

	return NextResponse.json(parseUpstream(ServiceSchema, service), {
		status: 201,
	});
});
