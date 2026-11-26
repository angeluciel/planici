// @vitest-environment node
// The workspace BFF routes: /api/tenants, /api/tenants/:tenantId,
// /api/tenants/active and /api/tenants/availability.
// Describes behavior as built: the tenant cookie is only ever set from an id
// the API returned, and is dropped when the API says it is no longer usable.
// Only the upstream call `api` is faked; WEB_APP_URL is set with vi.stubEnv.
import type { TenantResponse } from "@planici/schemas";
import { NextRequest, type NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/app/api/_lib/http";
import * as tenantOne from "@/app/api/tenants/[tenantId]/route";
import * as active from "@/app/api/tenants/active/route";
import * as availability from "@/app/api/tenants/availability/route";
import * as tenants from "@/app/api/tenants/route";

vi.mock("@/app/api/_lib/http", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/api/_lib/http")>()),
	api: vi.fn(),
}));

const WEB_ORIGIN = "http://localhost:3000";
const TOKEN = "access-token-of-ana";
const TENANT_ID = "studio-ana-4f9k2m7x1q";
const OTHER_TENANT_ID = "studio-bia-7h3n5p8r2t";
const ONE_YEAR = 60 * 60 * 24 * 365;

const TENANT: TenantResponse = {
	id: TENANT_ID,
	name: "Studio Ana",
	slug: "studio-ana",
	status: "active",
	plan: "free",
	role: "owner",
	trialStartedAt: null,
	createdAt: "2026-09-01T12:00:00.000Z",
};

function bffRequest(
	method: string,
	path: string,
	options: { body?: unknown; cookies?: string[]; origin?: string | null } = {},
) {
	const { body, cookies = [`token=${TOKEN}`], origin = WEB_ORIGIN } = options;
	return new NextRequest(`${WEB_ORIGIN}/api${path}`, {
		method,
		headers: {
			...(origin === null ? {} : { origin }),
			...(body === undefined ? {} : { "content-type": "application/json" }),
			cookie: cookies.join("; "),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

function tenantCookie(response: Response) {
	return (response as NextResponse).cookies.get("tenantId");
}

function params(tenantId: string) {
	return { params: Promise.resolve({ tenantId }) };
}

beforeEach(() => {
	vi.stubEnv("WEB_APP_URL", WEB_ORIGIN);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.mocked(api).mockReset();
});

describe("GET /api/tenants", () => {
	it("lists the caller's workspaces with the token and no tenant", async () => {
		vi.mocked(api).mockResolvedValue({ tenants: [TENANT] });

		const response = await tenants.GET(
			bffRequest("GET", "/tenants"),
			undefined,
		);

		expect(api).toHaveBeenCalledWith("", {
			method: "GET",
			resource: "tenants",
			token: TOKEN,
		});
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ tenants: [TENANT] });
	});

	it("answers 401 session.expired without a token cookie", async () => {
		const response = await tenants.GET(
			bffRequest("GET", "/tenants", { cookies: [] }),
			undefined,
		);

		expect(response.status).toBe(401);
		expect(api).not.toHaveBeenCalled();
	});

	it("turns a reply of the wrong shape into a 502", async () => {
		vi.mocked(api).mockResolvedValue({ tenants: [{ id: "x" }] });

		const response = await tenants.GET(
			bffRequest("GET", "/tenants"),
			undefined,
		);

		expect(response.status).toBe(502);
	});
});

describe("POST /api/tenants", () => {
	const create = (
		cookies?: string[],
		body: unknown = { name: "Studio Ana", slug: "studio-ana" },
	) =>
		tenants.POST(bffRequest("POST", "/tenants", { body, cookies }), undefined);

	it("creates the workspace and makes it the active one for the session", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await create();

		expect(api).toHaveBeenCalledWith("", {
			body: { name: "Studio Ana", slug: "studio-ana" },
			resource: "tenants",
			token: TOKEN,
		});
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(TENANT);
		expect(tenantCookie(response)).toMatchObject({
			value: TENANT_ID,
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		});
		expect(tenantCookie(response)?.maxAge).toBeUndefined();
	});

	it("keeps the tenant cookie for a year when the session is remembered", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await create([`token=${TOKEN}`, "rememberMe=1"]);

		expect(tenantCookie(response)?.maxAge).toBe(ONE_YEAR);
	});

	it("sets the cookie from the id the API returned, not from anything the browser sent", async () => {
		vi.mocked(api).mockResolvedValue({ ...TENANT, id: OTHER_TENANT_ID });

		const response = await create([`token=${TOKEN}`, `tenantId=${TENANT_ID}`]);

		expect(tenantCookie(response)?.value).toBe(OTHER_TENANT_ID);
	});

	it("validates the body before calling the API", async () => {
		const response = await create(undefined, { name: " ", slug: "studio-ana" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "tenantName.required",
			field: "name",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("sets no cookie when the API refuses the slug", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(409, { error: "tenantSlug.taken", field: "slug" }),
		);

		const response = await create();

		expect(response.status).toBe(409);
		expect(tenantCookie(response)).toBeUndefined();
	});

	it("refuses a cross-site create with 403", async () => {
		const response = await tenants.POST(
			bffRequest("POST", "/tenants", {
				body: { name: "Studio Ana", slug: "studio-ana" },
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
	});
});

describe("/api/tenants/:tenantId", () => {
	it("GET reads the workspace by id with the token", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await tenantOne.GET(
			bffRequest("GET", `/tenants/${TENANT_ID}`),
			params(TENANT_ID),
		);

		expect(api).toHaveBeenCalledWith(`/${TENANT_ID}`, {
			method: "GET",
			resource: "tenants",
			token: TOKEN,
		});
		await expect(response.json()).resolves.toEqual(TENANT);
	});

	it("PATCH renames the workspace with the validated body", async () => {
		vi.mocked(api).mockResolvedValue({ ...TENANT, name: "Studio Ana Souza" });

		const response = await tenantOne.PATCH(
			bffRequest("PATCH", `/tenants/${TENANT_ID}`, {
				body: { name: "  Studio Ana Souza  " },
			}),
			params(TENANT_ID),
		);

		expect(api).toHaveBeenCalledWith(`/${TENANT_ID}`, {
			method: "PATCH",
			body: { name: "Studio Ana Souza" },
			resource: "tenants",
			token: TOKEN,
		});
		expect(response.status).toBe(200);
	});

	it.each([
		"not-a-tenant",
		"../admin",
		"STUDIO-ANA-4F9K2M7X1Q",
	])("answers 404 tenant.not-found for id %j and never calls the API", async (tenantId) => {
		const get = await tenantOne.GET(
			bffRequest("GET", "/tenants/x"),
			params(tenantId),
		);
		const patch = await tenantOne.PATCH(
			bffRequest("PATCH", "/tenants/x", { body: { name: "Studio" } }),
			params(tenantId),
		);

		for (const response of [get, patch]) {
			expect(response.status).toBe(404);
			await expect(response.json()).resolves.toEqual({
				error: "tenant.not-found",
			});
		}
		expect(api).not.toHaveBeenCalled();
	});
});

describe("GET /api/tenants/active", () => {
	const read = (cookies: string[]) =>
		active.GET(bffRequest("GET", "/tenants/active", { cookies }), undefined);

	it("reads the workspace named by the tenant cookie", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await read([`token=${TOKEN}`, `tenantId=${TENANT_ID}`]);

		expect(api).toHaveBeenCalledWith(`/${TENANT_ID}`, {
			method: "GET",
			resource: "tenants",
			token: TOKEN,
		});
		await expect(response.json()).resolves.toEqual(TENANT);
		expect(tenantCookie(response)).toBeUndefined();
	});

	it("checks the session before the tenant: 401 without a token", async () => {
		const response = await read([`tenantId=${TENANT_ID}`]);

		expect(response.status).toBe(401);
	});

	it.each([
		["no tenant cookie", [`token=${TOKEN}`]],
		["a malformed tenant cookie", [`token=${TOKEN}`, "tenantId=../../admin"]],
	])("answers 400 tenant.required with %s and never calls the API", async (_, cookies) => {
		const response = await read(cookies);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "tenant.required",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it.each([
		403, 404,
	])("drops the tenant cookie when the API answers %i: the workspace is gone or no longer the caller's", async (status) => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(status, { error: "tenant.not-found" }),
		);

		const response = await read([`token=${TOKEN}`, `tenantId=${TENANT_ID}`]);

		expect(response.status).toBe(status);
		expect(tenantCookie(response)).toMatchObject({ value: "", maxAge: 0 });
	});

	it.each([
		401, 500, 502,
	])("keeps the tenant cookie when the API answers %i", async (status) => {
		vi.mocked(api).mockRejectedValue(new ApiError(status));

		const response = await read([`token=${TOKEN}`, `tenantId=${TENANT_ID}`]);

		expect(response.status).toBe(status);
		expect(tenantCookie(response)).toBeUndefined();
	});
});

describe("PUT /api/tenants/active", () => {
	const select = (body: unknown, cookies: string[] = [`token=${TOKEN}`]) =>
		active.PUT(
			bffRequest("PUT", "/tenants/active", { body, cookies }),
			undefined,
		);

	it("checks the workspace with the API, then sets the cookie from the id it returned", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await select({ tenantId: TENANT_ID });

		expect(api).toHaveBeenCalledWith(`/${TENANT_ID}`, {
			method: "GET",
			resource: "tenants",
			token: TOKEN,
		});
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(TENANT);
		expect(tenantCookie(response)?.value).toBe(TENANT_ID);
	});

	it("keeps the tenant cookie for a year when the session is remembered", async () => {
		vi.mocked(api).mockResolvedValue(TENANT);

		const response = await select({ tenantId: TENANT_ID }, [
			`token=${TOKEN}`,
			"rememberMe=1",
		]);

		expect(tenantCookie(response)?.maxAge).toBe(ONE_YEAR);
	});

	it("leaves the cookie alone when the API does not let the caller in", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(404, { error: "tenant.not-found" }),
		);

		const response = await select({ tenantId: OTHER_TENANT_ID }, [
			`token=${TOKEN}`,
			`tenantId=${TENANT_ID}`,
		]);

		expect(response.status).toBe(404);
		expect(tenantCookie(response)).toBeUndefined();
	});

	it("refuses a malformed id with 400 before calling the API", async () => {
		const response = await select({ tenantId: "../admin" });

		expect(response.status).toBe(400);
		expect(api).not.toHaveBeenCalled();
	});

	it("refuses a cross-site switch with 403", async () => {
		const response = await active.PUT(
			bffRequest("PUT", "/tenants/active", {
				body: { tenantId: TENANT_ID },
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
	});
});

describe("DELETE /api/tenants/active", () => {
	it("clears the tenant cookie and answers 204 without calling the API", async () => {
		const response = await active.DELETE(
			bffRequest("DELETE", "/tenants/active", {
				cookies: [`tenantId=${TENANT_ID}`],
			}),
			undefined,
		);

		expect(response.status).toBe(204);
		expect(tenantCookie(response)).toMatchObject({ value: "", maxAge: 0 });
		expect(api).not.toHaveBeenCalled();
	});

	it("refuses a cross-site clear with 403 and leaves the cookie alone", async () => {
		const response = await active.DELETE(
			bffRequest("DELETE", "/tenants/active", {
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(tenantCookie(response)).toBeUndefined();
	});
});

describe("GET /api/tenants/availability", () => {
	const check = (query: string) =>
		availability.GET(
			bffRequest("GET", `/tenants/availability?${query}`),
			undefined,
		);

	it("forwards only the normalized slug", async () => {
		vi.mocked(api).mockResolvedValue({ available: true });

		const response = await check(
			"slug=%20Studio-Ana%20&tenantId=studio-bia-7h3n5p8r2t",
		);

		expect(api).toHaveBeenCalledWith("/availability?slug=studio-ana", {
			method: "GET",
			resource: "tenants",
			token: TOKEN,
		});
		await expect(response.json()).resolves.toEqual({ available: true });
	});

	it.each([
		["", "tenantSlug.required"],
		["slug=studio%20ana", "tenantSlug.pattern"],
		["slug=studio%26admin%3D1", "tenantSlug.pattern"],
	])("refuses %j with 400 %s and never calls the API", async (query, error) => {
		const response = await check(query);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error, field: "slug" });
		expect(api).not.toHaveBeenCalled();
	});
});
