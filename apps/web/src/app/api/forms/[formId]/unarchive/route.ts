import { FormTemplateSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { parseUpstream, route } from "../../../_lib/http";
import { formIdParam, formsApi } from "../../_lib/forms";

type Context = { params: Promise<{ formId: string }> };

// POST /api/forms/:formId/unarchive
export const POST = route<Context>(async (request, { params }) => {
	const formId = formIdParam((await params).formId);
	const form = await formsApi(request, `/${formId}/unarchive`, {
		method: "POST",
	});

	return NextResponse.json(parseUpstream(FormTemplateSchema, form));
});
