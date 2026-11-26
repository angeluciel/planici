import { type MeResponse, MeResponseSchema } from "@planici/schemas";
import { type ApiFailure, apiFailure, sessionClient } from "./client";

export type MeResult = { ok: true; user: MeResponse } | ApiFailure;

// The signed-in user. A 401 renews the session once before failing.
export async function getMe(): Promise<MeResult> {
	try {
		const response = await sessionClient.get<unknown>("/me");
		return { ok: true, user: MeResponseSchema.parse(response.data) };
	} catch (error) {
		return apiFailure(error);
	}
}
