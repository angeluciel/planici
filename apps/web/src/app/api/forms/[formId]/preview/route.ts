import { FormChangePreviewResponseSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../../../_lib/http";
import { formIdParam, formsApi } from "../../_lib/forms";

type Context = { params: Promise<{ formId: string }> };

// POST /api/forms/:formId/preview
// stores nothing; says what a save would do
export const POST = route<Context>(async (request, { params }) => {
	const formId = formIdParam((await params).formId);
	const body = await readBody(request, z.unknown());
	const preview = await formsApi(request, `/${formId}/preview`, {
		method: "POST",
		body,
	});

	return NextResponse.json(
		parseUpstream(FormChangePreviewResponseSchema, preview),
	);
});
