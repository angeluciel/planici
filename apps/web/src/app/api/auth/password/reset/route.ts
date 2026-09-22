import { ResetPasswordSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, readBody, route } from "@/app/api/_lib/http";
import { clearSession } from "@/app/api/_lib/session";

export const POST = route(async (request) => {
	const body = await readBody(request, ResetPasswordSchema);

	await api("/password/reset", { body });

	return clearSession(new NextResponse(null, { status: 204 }));
});
