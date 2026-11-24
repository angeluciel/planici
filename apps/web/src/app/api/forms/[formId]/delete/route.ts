import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route } from "../../../_lib/http";
import { formIdParam, formsApi } from "../../_lib/forms";

type Context = { params: Promise<{ formId: string }> };

// POST /api/forms/:formId/delete with { deleteRecords?, confirmName }
// a delete that needs a confirmation is a POST with a body, never a DELETE
export const POST = route<Context>(async (request, { params }) => {
	const formId = formIdParam((await params).formId);
	const body = await readBody(request, z.unknown());

	await formsApi(request, `/${formId}/delete`, { method: "POST", body });

	return new NextResponse(null, { status: 204 });
});
