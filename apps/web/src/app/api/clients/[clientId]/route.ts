import { ClientSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../../_lib/http";
import { clientIdParam, clientsApi } from "../_lib/clients";

type Context = { params: Promise<{ clientId: string }> };

// GET /api/clients/:clientId
export const GET = route<Context>(async (request, { params }) => {
	const clientId = clientIdParam((await params).clientId);
	const client = await clientsApi(request, `/${clientId}`, { method: "GET" });

	return NextResponse.json(parseUpstream(ClientSchema, client));
});

// PATCH /api/clients/:clientId
export const PATCH = route<Context>(async (request, { params }) => {
	const clientId = clientIdParam((await params).clientId);
	const body = await readBody(request, z.unknown());
	const client = await clientsApi(request, `/${clientId}`, {
		method: "PATCH",
		body,
	});

	return NextResponse.json(parseUpstream(ClientSchema, client));
});
