import { FormTemplateSchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUpstream, readBody, route } from "../../_lib/http";
import { formIdParam, formsApi } from "../_lib/forms";

type Context = { params: Promise<{ formId: string }> };

// GET /api/forms/:formId
export const GET = route<Context>(async (request, { params }) => {
	const formId = formIdParam((await params).formId);
	const form = await formsApi(request, `/${formId}`, { method: "GET" });

	return NextResponse.json(parseUpstream(FormTemplateSchema, form));
});

// PATCH /api/forms/:formId
export const PATCH = route<Context>(async (request, { params }) => {
	const formId = formIdParam((await params).formId);
	const body = await readBody(request, z.unknown());
	const form = await formsApi(request, `/${formId}`, {
		method: "PATCH",
		body,
	});

	return NextResponse.json(parseUpstream(FormTemplateSchema, form));
});
