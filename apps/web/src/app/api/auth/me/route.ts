import { MeResponseSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { ApiError, api, parseUpstream, route } from "../../_lib/http";
import { ACCESS_COOKIE } from "../../_lib/session";

export const GET = route(async (request) => {
	const token = request.cookies.get(ACCESS_COOKIE)?.value;

	if (!token) {
		throw new ApiError(401, { error: "session.expired" });
	}

	const user = await api("/me", {
		method: "GET",
		token,
	});

	return NextResponse.json(parseUpstream(MeResponseSchema, user));
});
