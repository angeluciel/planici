import { ClientSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { parseUpstream, route } from "../../../_lib/http";
import { clientIdParam, clientsApi } from "../../_lib/clients";

type Context = { params: Promise<{ clientId: string }> };

// POST /api/clients/:clientId/reactivate
export const POST = route<Context>(async (request, { params }) => {
	const clientId = clientIdParam((await params).clientId);
	const client = await clientsApi(request, `/${clientId}/reactivate`, {
		method: "POST",
	});

	return NextResponse.json(parseUpstream(ClientSchema, client));
});
