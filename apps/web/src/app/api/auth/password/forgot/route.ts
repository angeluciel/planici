import { ForgotPasswordSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, readBody, route } from "@/app/api/_lib/http";

export const POST = route(async (request) => {
	const body = await readBody(request, ForgotPasswordSchema);

	await api("/password/forgot", { body });

	return new NextResponse(null, { status: 202 });
});
