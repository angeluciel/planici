import { SessionResponseSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { ApiError, parseUpstream } from "./http";

export const ACCESS_COOKIE = "token";
export const REFRESH_COOKIE = "refreshToken";
export const REMEMBER_COOKIE = "rememberMe";

function cookieOptions() {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
	};
}

function refreshMaxAge(): number {
	const match = /^(\d+)([smhd])$/.exec(process.env.JWT_REFRESH_TTL ?? "30d");

	if (!match) throw new ApiError(500);

	const units: Record<string, number> = {
		s: 1,
		m: 60,
		h: 3600,
		d: 86400,
	};

	const seconds = Number(match[1]) * units[match[2]];

	if (!Number.isSafeInteger(seconds) || seconds <= 0) {
		throw new ApiError(500);
	}

	return seconds;
}

export function sessionResponse(
	body: unknown,
	rememberMe = false,
	status = 200,
): NextResponse {
	const session = parseUpstream(SessionResponseSchema, body);
	const persistence = rememberMe ? { maxAge: refreshMaxAge() } : {};

	const response = NextResponse.json(
		{ ok: true, user: session.user },
		{ status },
	);

	const options = cookieOptions();

	response.cookies.set(ACCESS_COOKIE, session.accessToken, {
		...options,
		...(rememberMe ? { maxAge: session.expiresIn } : {}),
	});

	response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
		...options,
		...persistence,
	});

	response.cookies.set(REMEMBER_COOKIE, rememberMe ? "1" : "0", {
		...options,
		...persistence,
	});

	return response;
}

export function clearSession(response: NextResponse): NextResponse {
	for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE]) {
		response.cookies.set(name, "", {
			...cookieOptions(),
			maxAge: 0,
		});
	}

	return response;
}
