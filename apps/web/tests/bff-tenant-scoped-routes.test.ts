// @vitest-environment node
// The tenant-scoped BFF routes: /api/clients, /api/forms and /api/services.
// Describes behavior as built: each route forwards to its API resource with the
// session token and the active tenant, both read from httpOnly cookies only.
// Only the upstream call `api` is faked; WEB_APP_URL is set with vi.stubEnv.
import { getMessages } from "@planici/i18n";
import {
	CLIENT_CONSENT_TEXT_VERSION,
	type ServiceResponse,
} from "@planici/schemas";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/app/api/_lib/http";
import * as clientDelete from "@/app/api/clients/[clientId]/delete/route";
import * as clientInactivate from "@/app/api/clients/[clientId]/inactivate/route";
import * as clientReactivate from "@/app/api/clients/[clientId]/reactivate/route";
import * as clientOne from "@/app/api/clients/[clientId]/route";
import * as clientConsent from "@/app/api/clients/consent/route";
import * as clientList from "@/app/api/clients/route";
import * as formArchive from "@/app/api/forms/[formId]/archive/route";
import * as formDelete from "@/app/api/forms/[formId]/delete/route";
import * as formPreview from "@/app/api/forms/[formId]/preview/route";
import * as formOne from "@/app/api/forms/[formId]/route";
import * as formUnarchive from "@/app/api/forms/[formId]/unarchive/route";
import * as formVersion from "@/app/api/forms/[formId]/versions/[version]/route";
import * as formList from "@/app/api/forms/route";
import * as serviceDelete from "@/app/api/services/[serviceId]/delete/route";
import * as serviceInactivate from "@/app/api/services/[serviceId]/inactivate/route";
import * as serviceReactivate from "@/app/api/services/[serviceId]/reactivate/route";
import * as serviceOne from "@/app/api/services/[serviceId]/route";
import * as serviceList from "@/app/api/services/route";
import * as serviceTemplates from "@/app/api/services/templates/route";
import { CLIENT_ID, client } from "./clients-harness";
import { FORM_ID, TENANT, template } from "./forms-harness";
import { RECORD_ID, versionBody } from "./record-harness";

vi.mock("@/app/api/_lib/http", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/api/_lib/http")>()),
	api: vi.fn(),
}));

const WEB_ORIGIN = "http://localhost:3000";
const TOKEN = "access-token-of-ana";
const OTHER_TENANT = "studio-bia-7h3n5p8r2t";
const SESSION = [`token=${TOKEN}`, `tenantId=${TENANT}`];

type Params = Record<string, string>;
type Context = { params: Promise<Params> };
type Resource = "clients" | "forms" | "services";
type Method = "GET" | "POST" | "PATCH";

type Case = {
	label: string;
	resource: Resource;
	// method shorthand: each route types its own params
	handle(request: NextRequest, context: Context): Promise<Response>;
	method: Method;
	path: string;
	params?: Params;
	body?: unknown;
	upstreamPath: string;
	reply: unknown;
	status: 200 | 201 | 204;
};

// services-harness sets up DOM shims on import, so the service is built here
const SERVICE_ID = RECORD_ID;
function service(): ServiceResponse {
	return {
		id: SERVICE_ID,
		form: {
			id: FORM_ID,
			name: "Serviço",
			version: 1,
			latestVersion: 1,
			status: "active",
		},
		revision: 3,
		values: {},
		missingRequired: [],
		createdAt: "2026-11-01T12:00:00.000Z",
		updatedAt: "2026-11-01T12:00:00.000Z",
		name: "Sessão individual",
		durationMinutes: 90,
		priceCents: 15000,
		currency: "BRL",
		status: "active",
		hasHistory: false,
	};
}

const PREVIEW = {
	schemaChanged: false,
	nextVersion: 2,
	recordCount: 0,
	recordsLosingAnswers: 0,
	recordsGainingRequiredFields: 0,
	added: [],
	removed: [],
	changed: [],
};

const C = { clientId: CLIENT_ID };
const F = { formId: FORM_ID };
const S = { serviceId: SERVICE_ID };

const CASES: Case[] = [
	{
		label: "GET /api/clients",
		resource: "clients",
		handle: clientList.GET,
		method: "GET",
		path: "/clients",
		upstreamPath: "",
		reply: { clients: [], nextCursor: null, total: 0 },
		status: 200,
	},
	{
		label: "POST /api/clients",
		resource: "clients",
		handle: clientList.POST,
		method: "POST",
		path: "/clients",
		body: { name: "Ana Souza" },
		upstreamPath: "",
		reply: client(),
		status: 201,
	},
	{
		label: "GET /api/clients/:id",
		resource: "clients",
		handle: clientOne.GET,
		method: "GET",
		path: `/clients/${CLIENT_ID}`,
		params: C,
		upstreamPath: `/${CLIENT_ID}`,
		reply: client(),
		status: 200,
	},
	{
		label: "PATCH /api/clients/:id",
		resource: "clients",
		handle: clientOne.PATCH,
		method: "PATCH",
		path: `/clients/${CLIENT_ID}`,
		params: C,
		body: { revision: 3 },
		upstreamPath: `/${CLIENT_ID}`,
		reply: client(),
		status: 200,
	},
	{
		label: "POST /api/clients/:id/delete",
		resource: "clients",
		handle: clientDelete.POST,
		method: "POST",
		path: `/clients/${CLIENT_ID}/delete`,
		params: C,
		body: { confirmName: "Ana Souza" },
		upstreamPath: `/${CLIENT_ID}/delete`,
		reply: null,
		status: 204,
	},
	{
		label: "POST /api/clients/:id/inactivate",
		resource: "clients",
		handle: clientInactivate.POST,
		method: "POST",
		path: `/clients/${CLIENT_ID}/inactivate`,
		params: C,
		upstreamPath: `/${CLIENT_ID}/inactivate`,
		reply: client(),
		status: 200,
	},
	{
		label: "POST /api/clients/:id/reactivate",
		resource: "clients",
		handle: clientReactivate.POST,
		method: "POST",
		path: `/clients/${CLIENT_ID}/reactivate`,
		params: C,
		upstreamPath: `/${CLIENT_ID}/reactivate`,
		reply: client(),
		status: 200,
	},
	{
		label: "GET /api/forms",
		resource: "forms",
		handle: formList.GET,
		method: "GET",
		path: "/forms",
		upstreamPath: "",
		reply: { forms: [] },
		status: 200,
	},
	{
		label: "POST /api/forms",
		resource: "forms",
		handle: formList.POST,
		method: "POST",
		path: "/forms",
		body: { type: "client", name: "Ficha" },
		upstreamPath: "",
		reply: template(),
		status: 201,
	},
	{
		label: "GET /api/forms/:id",
		resource: "forms",
		handle: formOne.GET,
		method: "GET",
		path: `/forms/${FORM_ID}`,
		params: F,
		upstreamPath: `/${FORM_ID}`,
		reply: template(),
		status: 200,
	},
	{
		label: "PATCH /api/forms/:id",
		resource: "forms",
		handle: formOne.PATCH,
		method: "PATCH",
		path: `/forms/${FORM_ID}`,
		params: F,
		body: { revision: 1 },
		upstreamPath: `/${FORM_ID}`,
		reply: template(),
		status: 200,
	},
	{
		label: "POST /api/forms/:id/delete",
		resource: "forms",
		handle: formDelete.POST,
		method: "POST",
		path: `/forms/${FORM_ID}/delete`,
		params: F,
		body: { confirmName: "Ficha" },
		upstreamPath: `/${FORM_ID}/delete`,
		reply: null,
		status: 204,
	},
	{
		label: "POST /api/forms/:id/archive",
		resource: "forms",
		handle: formArchive.POST,
		method: "POST",
		path: `/forms/${FORM_ID}/archive`,
		params: F,
		upstreamPath: `/${FORM_ID}/archive`,
		reply: template({ status: "archived" }),
		status: 200,
	},
	{
		label: "POST /api/forms/:id/unarchive",
		resource: "forms",
		handle: formUnarchive.POST,
		method: "POST",
		path: `/forms/${FORM_ID}/unarchive`,
		params: F,
		upstreamPath: `/${FORM_ID}/unarchive`,
		reply: template(),
		status: 200,
	},
	{
		label: "POST /api/forms/:id/preview",
		resource: "forms",
		handle: formPreview.POST,
		method: "POST",
		path: `/forms/${FORM_ID}/preview`,
		params: F,
		body: { fields: [] },
		upstreamPath: `/${FORM_ID}/preview`,
		reply: PREVIEW,
		status: 200,
	},
	{
		label: "GET /api/forms/:id/versions/:version",
		resource: "forms",
		handle: formVersion.GET,
		method: "GET",
		path: `/forms/${FORM_ID}/versions/2`,
		params: { ...F, version: "2" },
		upstreamPath: `/${FORM_ID}/versions/2`,
		reply: versionBody(2, template().fields),
		status: 200,
	},
	{
		label: "GET /api/services",
		resource: "services",
		handle: serviceList.GET,
		method: "GET",
		path: "/services",
		upstreamPath: "",
		reply: { services: [], nextCursor: null, total: 0 },
		status: 200,
	},
	{
		label: "POST /api/services",
		resource: "services",
		handle: serviceList.POST,
		method: "POST",
		path: "/services",
		body: { name: "Sessão individual" },
		upstreamPath: "",
		reply: service(),
		status: 201,
	},
	{
		label: "GET /api/services/:id",
		resource: "services",
		handle: serviceOne.GET,
		method: "GET",
		path: `/services/${SERVICE_ID}`,
		params: S,
		upstreamPath: `/${SERVICE_ID}`,
		reply: service(),
		status: 200,
	},
	{
		label: "PATCH /api/services/:id",
		resource: "services",
		handle: serviceOne.PATCH,
		method: "PATCH",
		path: `/services/${SERVICE_ID}`,
		params: S,
		body: { revision: 3 },
		upstreamPath: `/${SERVICE_ID}`,
		reply: service(),
		status: 200,
	},
	{
		label: "POST /api/services/:id/delete",
		resource: "services",
		handle: serviceDelete.POST,
		method: "POST",
		path: `/services/${SERVICE_ID}/delete`,
		params: S,
		body: { confirmName: "Sessão individual" },
		upstreamPath: `/${SERVICE_ID}/delete`,
		reply: null,
		status: 204,
	},
	{
		label: "POST /api/services/:id/inactivate",
		resource: "services",
		handle: serviceInactivate.POST,
		method: "POST",
		path: `/services/${SERVICE_ID}/inactivate`,
		params: S,
		upstreamPath: `/${SERVICE_ID}/inactivate`,
		reply: service(),
		status: 200,
	},
	{
		label: "POST /api/services/:id/reactivate",
		resource: "services",
		handle: serviceReactivate.POST,
		method: "POST",
		path: `/services/${SERVICE_ID}/reactivate`,
		params: S,
		upstreamPath: `/${SERVICE_ID}/reactivate`,
		reply: service(),
		status: 200,
	},
	{
		label: "GET /api/services/templates",
		resource: "services",
		handle: serviceTemplates.GET,
		method: "GET",
		path: "/services/templates",
		upstreamPath: "/templates",
		reply: { templates: [], archivedCount: 0 },
		status: 200,
	},
];

const PARSED = CASES.filter((c) => c.status !== 204);
const WRITES = CASES.filter((c) => c.method !== "GET");
const WITH_ID = CASES.filter((c) => c.params !== undefined);

function bffRequest(
	method: string,
	path: string,
	options: {
		body?: unknown;
		cookies?: string[];
		headers?: Record<string, string>;
	} = {},
) {
	const { body, cookies = SESSION, headers = {} } = options;
	return new NextRequest(`${WEB_ORIGIN}/api${path}`, {
		method,
		headers: {
			...(method === "GET" ? {} : { origin: WEB_ORIGIN }),
			...(body === undefined ? {} : { "content-type": "application/json" }),
			cookie: cookies.join("; "),
			...headers,
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

function context(params: Params = {}): Context {
	return { params: Promise.resolve(params) };
}

function send(c: Case, options: Parameters<typeof bffRequest>[2] = {}) {
	return c.handle(
		bffRequest(c.method, c.path, { body: c.body, ...options }),
		context(c.params),
	);
}

beforeEach(() => {
	vi.stubEnv("WEB_APP_URL", WEB_ORIGIN);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.mocked(api).mockReset();
});

describe.each(CASES)("$label", (c) => {
	it(`forwards to the ${c.resource} API with the session token and the active tenant`, async () => {
		vi.mocked(api).mockResolvedValue(c.reply);

		const response = await send(c);

		expect(api).toHaveBeenCalledOnce();
		expect(api).toHaveBeenCalledWith(c.upstreamPath, {
			method: c.method,
			body: c.body,
			resource: c.resource,
			token: TOKEN,
			tenantId: TENANT,
		});
		expect(response.status).toBe(c.status);
		if (c.status === 204) {
			expect(await response.text()).toBe("");
		} else {
			await expect(response.json()).resolves.toEqual(c.reply);
		}
	});

	it("takes the tenant from the cookie, never from an X-Tenant-Id header the browser sends", async () => {
		vi.mocked(api).mockResolvedValue(c.reply);

		await send(c, { headers: { "x-tenant-id": OTHER_TENANT } });

		expect(vi.mocked(api).mock.calls[0]?.[1]?.tenantId).toBe(TENANT);
	});

	it("answers 401 session.expired without a token cookie and never calls the API", async () => {
		const response = await send(c, { cookies: [`tenantId=${TENANT}`] });

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "session.expired",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it.each([
		["no tenant cookie", [`token=${TOKEN}`]],
		["a malformed tenant cookie", [`token=${TOKEN}`, "tenantId=../../admin"]],
	])("answers 400 tenant.required with %s and never calls the API", async (_, cookies) => {
		const response = await send(c, { cookies });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "tenant.required",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("passes an upstream error through with its status and body", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(422, { error: "upstream.rejected", field: "name" }),
		);

		const response = await send(c);

		expect(response.status).toBe(422);
		await expect(response.json()).resolves.toEqual({
			error: "upstream.rejected",
			field: "name",
		});
	});
});

describe.each(PARSED)("$label: an upstream reply of the wrong shape", (c) => {
	it("becomes a 502, not a body the browser trusts", async () => {
		vi.mocked(api).mockResolvedValue({ unexpected: true });

		const response = await send(c);

		expect(response.status).toBe(502);
	});
});

describe.each(WRITES)("$label: cross-site writes", (c) => {
	it("are refused with 403 before the API is called", async () => {
		const response = await send(c, {
			headers: { origin: "https://evil.example" },
		});

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
	});
});

describe.each(WITH_ID)("$label: a malformed id", (c) => {
	it("answers 404 and never calls the API", async () => {
		const [key] = Object.keys(c.params ?? {});
		const params = { ...c.params, [key ?? ""]: "not-a-uuid" };
		const entity = { clients: "client", forms: "form", services: "service" }[
			c.resource
		];

		const response = await c.handle(
			bffRequest(c.method, c.path, { body: c.body }),
			context(params),
		);

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: `${entity}.not-found`,
		});
		expect(api).not.toHaveBeenCalled();
	});
});

describe("GET /api/forms/:id/versions/:version", () => {
	it.each([
		"0",
		"1e0",
		"0x10",
		" 2",
		"-1",
	])("answers 404 formVersion.not-found for version %j and never calls the API", async (version) => {
		const response = await formVersion.GET(
			bffRequest("GET", `/forms/${FORM_ID}/versions/x`),
			{ params: Promise.resolve({ formId: FORM_ID, version }) },
		);

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "formVersion.not-found",
		});
		expect(api).not.toHaveBeenCalled();
	});
});

describe("list queries", () => {
	it.each([
		{
			label: "GET /api/clients",
			handle: clientList.GET,
			path: "/clients",
			reply: { clients: [], nextCursor: null, total: 0 },
		},
		{
			label: "GET /api/services",
			handle: serviceList.GET,
			path: "/services",
			reply: { services: [], nextCursor: null, total: 0 },
		},
	])("$label forwards only q, status, formId, sort, limit and after", async ({
		handle,
		path,
		reply,
	}) => {
		vi.mocked(api).mockResolvedValue(reply);
		const query =
			"after=c2&tenantId=studio-bia-7h3n5p8r2t&q=ana&limit=20&sort=name&token=x&formId=f1&status=active";

		await handle(bffRequest("GET", `${path}?${query}`), undefined);

		expect(vi.mocked(api).mock.calls[0]?.[0]).toBe(
			"?q=ana&status=active&formId=f1&sort=name&limit=20&after=c2",
		);
	});

	it("GET /api/forms forwards only type and includeArchived", async () => {
		vi.mocked(api).mockResolvedValue({ forms: [] });

		await formList.GET(
			bffRequest(
				"GET",
				"/forms?tenantId=studio-bia-7h3n5p8r2t&includeArchived=true&type=client",
			),
			undefined,
		);

		expect(vi.mocked(api).mock.calls[0]?.[0]).toBe(
			"?type=client&includeArchived=true",
		);
	});
});

describe("GET /api/clients/consent", () => {
	function consentRequest(headers: Record<string, string>) {
		return new NextRequest(`${WEB_ORIGIN}/api/clients/consent`, { headers });
	}

	it.each([
		[
			"the NEXT_LOCALE cookie",
			{ cookie: "NEXT_LOCALE=en-US", "accept-language": "pt-BR" },
			"en-US",
		],
		[
			"an exact Accept-Language tag",
			{ "accept-language": "en-US,pt-BR;q=0.5" },
			"en-US",
		],
		[
			"the language of an Accept-Language tag",
			{ "accept-language": "en-GB,fr;q=0.8" },
			"en-US",
		],
		[
			"the default when nothing matches",
			{ "accept-language": "fr-FR,de;q=0.8" },
			"pt-BR",
		],
		["the default when nothing is sent", {}, "pt-BR"],
	] as const)("answers in the locale of %s", async (_, headers, locale) => {
		const response = await clientConsent.GET(
			consentRequest(headers),
			undefined,
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			version: CLIENT_CONSENT_TEXT_VERSION,
			text: getMessages(locale).clients.form.consent,
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("ignores a NEXT_LOCALE cookie that is not a supported locale", async () => {
		const response = await clientConsent.GET(
			consentRequest({ cookie: "NEXT_LOCALE=xx", "accept-language": "en-US" }),
			undefined,
		);

		await expect(response.json()).resolves.toMatchObject({
			text: getMessages("en-US").clients.form.consent,
		});
	});
});
