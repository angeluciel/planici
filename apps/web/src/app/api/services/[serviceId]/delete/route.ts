import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "../../../_lib/http";
import { serviceIdParam, servicesApi } from "../../_lib/services";

type Context = { params: Promise<{ serviceId: string }> };

// POST /api/services/:serviceId/delete with { confirmName }
// a delete that needs a confirmation is a POST with a body, never a DELETE
export const POST = route<Context>(async (request, { params }) => {
	const serviceId = serviceIdParam((await params).serviceId);
	const body = await readBody(request, z.unknown());

	await servicesApi(request, `/${serviceId}/delete`, { method: "POST", body });

	return new NextResponse(null, { status: 204 });
});
