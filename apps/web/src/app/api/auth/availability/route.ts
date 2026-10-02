import {
	AvailabilityQuerySchema,
	AvailabilityResponseSchema,
} from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, parseInput, parseUpstream, route } from "../../_lib/http";

export const GET = route(async (request) => {
	const query = parseInput(
		AvailabilityQuerySchema,
		Object.fromEntries(request.nextUrl.searchParams),
	);

	const param = query.email ?? query.slug;

	if (param === undefined) {
		throw new Error("Either email or slug are required.");
	}

	const search = new URLSearchParams(param);

	if (query.email !== undefined) {
		search.set("email", query.email);
	}

	if (query.slug !== undefined) {
		search.set("slug", query.slug);
	}

	const result = await api(`/availability?${search}`, {
		method: "GET",
	});

	return NextResponse.json(parseUpstream(AvailabilityResponseSchema, result));
});
