import { FormVersionResponseSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { parseUpstream, route } from "../../../../_lib/http";
import { formIdParam, formsApi, versionParam } from "../../../_lib/forms";

type Context = { params: Promise<{ formId: string; version: string }> };

// GET /api/forms/:formId/versions/:version
export const GET = route<Context>(async (request, { params }) => {
	const { formId, version } = await params;
	const result = await formsApi(
		request,
		`/${formIdParam(formId)}/versions/${versionParam(version)}`,
		{ method: "GET" },
	);

	return NextResponse.json(parseUpstream(FormVersionResponseSchema, result));
});
