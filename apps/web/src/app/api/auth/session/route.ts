import { LoginRequestSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, errorResponse, readBody, route } from "../../_lib/http";
import {
	clearSession,
	REFRESH_COOKIE,
	sessionResponse,
} from "../../_lib/session";

export const POST = route(async (request) => {
	const body = await readBody(request, LoginRequestSchema);
	const session = await api("/login", { body });

	return sessionResponse(session, body.rememberMe ?? false);
});

export const DELETE = route(async (request) => {
	let response: NextResponse;

	try {
		const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

		if (refreshToken) {
			await api("/logout", { body: { refreshToken } });
		}

		response = new NextResponse(null, { status: 204 });
	} catch (error) {
		response = errorResponse(error);
	}

	return clearSession(response);
});
