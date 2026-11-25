import { ServiceSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { parseUpstream, route } from "../../../_lib/http";
import { serviceIdParam, servicesApi } from "../../_lib/services";

type Context = { params: Promise<{ serviceId: string }> };

// POST /api/services/:serviceId/inactivate
export const POST = route<Context>(async (request, { params }) => {
	const serviceId = serviceIdParam((await params).serviceId);
	const service = await servicesApi(request, `/${serviceId}/inactivate`, {
		method: "POST",
	});

	return NextResponse.json(parseUpstream(ServiceSchema, service));
});
