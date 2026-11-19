import { ClientListResponseSchema, ClientSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../_lib/http";
import { clientsApi } from "./_lib/clients";

// GET /api/clients?q&status&limit&after
// the API validates the query (422 clientSearch.min, clientStatus.invalid,
// limit.invalid, cursor.invalid); nothing else is forwarded
export const GET = route(async (request) => {
	const incoming = request.nextUrl.searchParams;
	const query = new URLSearchParams();

	for (const key of ["q", "status", "limit", "after"]) {
		const value = incoming.get(key);
		if (value !== null) query.set(key, value);
	}

	const suffix = query.size > 0 ? `?${query.toString()}` : "";
	const list = await clientsApi(request, suffix, { method: "GET" });

	return NextResponse.json(parseUpstream(ClientListResponseSchema, list));
});

// POST /api/clients
// the body is forwarded as is: the API answers 422 with the field
export const POST = route(async (request) => {
	const body = await readBody(request, z.unknown());
	const client = await clientsApi(request, "", { method: "POST", body });

	return NextResponse.json(parseUpstream(ClientSchema, client), {
		status: 201,
	});
});
