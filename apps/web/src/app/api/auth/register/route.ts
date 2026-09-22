import { RegisterRequestSchema } from "@planici/schemas";
import { api, readBody, route } from "../../_lib/http";
import { sessionResponse } from "../../_lib/session";

export const POST = route(async (request) => {
	const body = await readBody(request, RegisterRequestSchema);
	const session = await api("/register", { body });

	return sessionResponse(session, false, 201);
});
