import { ServiceSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../../_lib/http";
import { serviceIdParam, servicesApi } from "../_lib/services";

type Context = { params: Promise<{ serviceId: string }> };

// GET /api/services/:serviceId
export const GET = route<Context>(async (request, { params }) => {
	const serviceId = serviceIdParam((await params).serviceId);
	const service = await servicesApi(request, `/${serviceId}`, {
		method: "GET",
	});

	return NextResponse.json(parseUpstream(ServiceSchema, service));
});

// PATCH /api/services/:serviceId
export const PATCH = route<Context>(async (request, { params }) => {
	const serviceId = serviceIdParam((await params).serviceId);
	const body = await readBody(request, z.unknown());
	const service = await servicesApi(request, `/${serviceId}`, {
		method: "PATCH",
		body,
	});

	return NextResponse.json(parseUpstream(ServiceSchema, service));
});
