import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "../../../_lib/http";
import { clientIdParam, clientsApi } from "../../_lib/clients";

type Context = { params: Promise<{ clientId: string }> };

// POST /api/clients/:clientId/delete with { confirmName }
// a delete that needs a confirmation is a POST with a body, never a DELETE
export const POST = route<Context>(async (request, { params }) => {
	const clientId = clientIdParam((await params).clientId);
	const body = await readBody(request, z.unknown());

	await clientsApi(request, `/${clientId}/delete`, { method: "POST", body });

	return new NextResponse(null, { status: 204 });
});
