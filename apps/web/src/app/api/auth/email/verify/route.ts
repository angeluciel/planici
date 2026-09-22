import {
	EmailVerifiedResponseSchema,
	VerifyEmailCodeSchema,
} from "@planici/schemas";
import { NextResponse } from "next/server";

export const POST = route(async (request) => {
	const body = await readBody(request, VerifyEmailCodeSchema);
	const result = await api("/email/verify", { body });

	return NextResponse.json(parseUpstream(EmailVerifiedResponseSchema, result));
});
