import { FormListResponseSchema, FormTemplateSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../_lib/http";
import { formsApi } from "./_lib/forms";

// GET /api/forms?type&includeArchived
// the API validates the query (422 formType.invalid, includeArchived.invalid)
export const GET = route(async (request) => {
	const incoming = request.nextUrl.searchParams;
	const query = new URLSearchParams();

	for (const key of ["type", "includeArchived"]) {
		const value = incoming.get(key);
		if (value !== null) query.set(key, value);
	}

	const suffix = query.size > 0 ? `?${query.toString()}` : "";
	const list = await formsApi(request, suffix, { method: "GET" });

	return NextResponse.json(parseUpstream(FormListResponseSchema, list));
});

// POST /api/forms
// the body is forwarded as is: shape errors come back from the API as 422
// with the full field path (fields.3.label)
export const POST = route(async (request) => {
	const body = await readBody(request, z.unknown());
	const form = await formsApi(request, "", { method: "POST", body });

	return NextResponse.json(parseUpstream(FormTemplateSchema, form), {
		status: 201,
	});
});
