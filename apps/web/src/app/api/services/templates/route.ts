import { ServiceTemplateSummarySchema } from "@planici/schemas";
import { NextResponse } from "next/server";
import { parseUpstream, route } from "../../_lib/http";
import { servicesApi } from "../_lib/services";

// GET /api/services/templates: the template chips of the narrow list (R14)
export const GET = route(async (request) => {
	const summary = await servicesApi(request, "/templates", { method: "GET" });

	return NextResponse.json(
		parseUpstream(ServiceTemplateSummarySchema, summary),
	);
});
