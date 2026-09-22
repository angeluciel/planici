import { ApiError, api, errorResponse, route } from "../../_lib/http";
import {
	clearSession,
	REFRESH_COOKIE,
	REMEMBER_COOKIE,
	sessionResponse,
} from "../../_lib/session";

export const POST = route(async (request) => {
	try {
		const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

		if (!refreshToken) {
			throw new ApiError(401, { error: "session.expired" });
		}

		const session = await api("/refresh", {
			body: { refreshToken },
		});

		const rememberMe = request.cookies.get(REMEMBER_COOKIE)?.value === "1";

		return sessionResponse(session, rememberMe);
	} catch (error) {
		if (error instanceof ApiError && [401, 403].includes(error.status)) {
			return clearSession(errorResponse(error));
		}

		throw error;
	}
});
