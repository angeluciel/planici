import { RequestEmailCodeSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { api, readBody, route } from "@/app/api/_lib/http";

export const POST = route(async (request) => {
	const body = await readBody(request, RequestEmailCodeSchema);

	await api("/email/code", { body });

	return new NextResponse(null, { status: 202 });
});
