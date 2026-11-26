// @vitest-environment node
// The BFF's upstream client and route guards (src/app/api/_lib/http.ts).
// Describes behavior as built: every BFF route depends on it to forward the
// session token and the active tenant, and to refuse cross-site writes. Only
// axios.request is faked; API_URL and WEB_APP_URL are set with vi.stubEnv.
import axios, { AxiosError, type AxiosResponse } from "axios";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	ApiError,
	api,
	errorResponse,
	parseUpstream,
	readBody,
	route,
} from "@/app/api/_lib/http";

const WEB_ORIGIN = "http://localhost:3000";
const API_URL = "http://api.internal:3333";

function upstream(
	status: number,
	data = "",
	headers: Record<string, string> = {},
): AxiosResponse<string> {
	return { status, data, headers } as unknown as AxiosResponse<string>;
}

function sentRequest() {
	const [config] = vi.mocked(axios.request).mock.calls[0] ?? [];
	if (!config) throw new Error("axios.request was not called");
	return config;
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
	const error = await promise.then(
		() => {
			throw new Error("expected a rejection");
		},
		(reason: unknown) => reason,
	);
	expect(error).toBeInstanceOf(ApiError);
	return error as ApiError;
}

beforeEach(() => {
	vi.stubEnv("API_URL", API_URL);
	vi.stubEnv("WEB_APP_URL", WEB_ORIGIN);
	vi.spyOn(axios, "request").mockResolvedValue(upstream(200, "{}"));
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("api(): the upstream request", () => {
	it("joins API_URL, the resource and the path, dropping trailing slashes from API_URL", async () => {
		vi.stubEnv("API_URL", `${API_URL}//`);

		await api("/abc/delete", { resource: "clients" });

		expect(sentRequest().url).toBe(`${API_URL}/clients/abc/delete`);
	});

	it("defaults to POST on the auth resource", async () => {
		await api("/login", { body: { email: "ana@planici.co" } });

		expect(sentRequest()).toMatchObject({
			url: `${API_URL}/auth/login`,
			method: "POST",
			data: { email: "ana@planici.co" },
		});
	});

	it("sends the token as a bearer and the tenant as X-Tenant-Id", async () => {
		await api("", {
			method: "GET",
			resource: "clients",
			token: "access-token-of-ana",
			tenantId: "studio-ana-4f9k2m7x1q",
		});

		expect(sentRequest().headers).toMatchObject({
			Accept: "application/json",
			Authorization: "Bearer access-token-of-ana",
			"X-Tenant-Id": "studio-ana-4f9k2m7x1q",
		});
	});

	it("sends no Authorization, X-Tenant-Id or Content-Type when there is no token, tenant or body", async () => {
		await api("", { method: "GET", resource: "tenants" });

		const headers = sentRequest().headers as Record<string, unknown>;
		expect(headers.Authorization).toBeUndefined();
		expect(headers["X-Tenant-Id"]).toBeUndefined();
		expect(headers["Content-Type"]).toBeNull();
	});

	it("marks a request with a body as JSON", async () => {
		await api("/register", { body: { name: "Ana" } });

		expect(sentRequest().headers).toMatchObject({
			"Content-Type": "application/json",
		});
	});

	it("never follows redirects and bounds the wait to 10 seconds", async () => {
		await api("/me", { method: "GET" });

		expect(sentRequest()).toMatchObject({ maxRedirects: 0, timeout: 10_000 });
	});

	it("lets every status through to its own mapping instead of axios throwing", async () => {
		await api("/me", { method: "GET" });

		const { validateStatus } = sentRequest();
		for (const status of [200, 302, 404, 500]) {
			expect(validateStatus?.(status)).toBe(true);
		}
	});

	it("fails with 500 before calling out when API_URL is missing or blank", async () => {
		vi.stubEnv("API_URL", "   ");

		const error = await rejection(api("/me", { method: "GET" }));

		expect(error.status).toBe(500);
		expect(axios.request).not.toHaveBeenCalled();
	});
});

describe("api(): the upstream answer", () => {
	it("returns the parsed JSON body of a 2xx", async () => {
		vi.mocked(axios.request).mockResolvedValue(
			upstream(200, '{"available":true}'),
		);

		await expect(api("/availability", { method: "GET" })).resolves.toEqual({
			available: true,
		});
	});

	it("returns null for an empty or non-JSON 2xx body", async () => {
		vi.mocked(axios.request).mockResolvedValueOnce(upstream(204, ""));
		vi.mocked(axios.request).mockResolvedValueOnce(upstream(200, "<html>"));

		await expect(api("/logout")).resolves.toBeNull();
		await expect(api("/logout")).resolves.toBeNull();
	});

	it.each([
		301, 302, 303, 307, 308,
	])("turns a %i redirect into a 502 instead of following it", async (status) => {
		vi.mocked(axios.request).mockResolvedValue(
			upstream(status, "", { location: "https://elsewhere.example" }),
		);

		const error = await rejection(api("/me", { method: "GET" }));

		expect(error.status).toBe(502);
	});

	it("keeps the status and the { error, field } body of an upstream error", async () => {
		vi.mocked(axios.request).mockResolvedValue(
			upstream(422, '{"error":"clientName.required","field":"name"}'),
		);

		const error = await rejection(api("", { resource: "clients" }));

		expect(error.status).toBe(422);
		expect(error.body).toEqual({
			error: "clientName.required",
			field: "name",
		});
	});

	it("replaces an upstream error body that is not { error } with 'unexpected'", async () => {
		vi.mocked(axios.request).mockResolvedValue(
			upstream(500, '{"message":"stack trace here"}'),
		);

		const error = await rejection(api("/me", { method: "GET" }));

		expect(error.status).toBe(500);
		expect(error.body).toEqual({ error: "unexpected" });
	});

	it("names a bodyless 429 'code.rate-limited' and keeps its Retry-After", async () => {
		vi.mocked(axios.request).mockResolvedValue(
			upstream(429, "", { "retry-after": "30" }),
		);

		const error = await rejection(api("/email/code"));

		expect(error.status).toBe(429);
		expect(error.body).toEqual({ error: "code.rate-limited" });
		expect(error.retryAfter).toBe("30");
	});

	it.each([
		"ECONNABORTED",
		"ETIMEDOUT",
	])("answers 504 when the call times out (%s)", async (code) => {
		vi.mocked(axios.request).mockRejectedValue(new AxiosError("slow", code));

		const error = await rejection(api("/me", { method: "GET" }));

		expect(error.status).toBe(504);
	});

	it("answers 502 when the API cannot be reached", async () => {
		vi.mocked(axios.request).mockRejectedValue(
			new AxiosError("refused", "ECONNREFUSED"),
		);

		const error = await rejection(api("/me", { method: "GET" }));

		expect(error.status).toBe(502);
	});
});

describe("route(): guards around every BFF handler", () => {
	const ok = () => Promise.resolve(NextResponse.json({ ok: true }));

	function bffRequest(method: string, origin?: string) {
		return new NextRequest(`${WEB_ORIGIN}/api/anything`, {
			method,
			headers: origin ? { origin } : {},
		});
	}

	it.each([
		"POST",
		"PATCH",
		"PUT",
		"DELETE",
	])("refuses a %s from another origin with 403 and never runs the handler", async (method) => {
		const handler = vi.fn(ok);

		const response = await route(handler)(
			bffRequest(method, "https://evil.example"),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(handler).not.toHaveBeenCalled();
	});

	it("refuses a write with no Origin header", async () => {
		const handler = vi.fn(ok);

		const response = await route(handler)(bffRequest("POST"), undefined);

		expect(response.status).toBe(403);
		expect(handler).not.toHaveBeenCalled();
	});

	it("runs a write from the web app's own origin", async () => {
		const response = await route(ok)(bffRequest("POST", WEB_ORIGIN), undefined);

		expect(response.status).toBe(200);
	});

	it.each([
		"GET",
		"HEAD",
		"OPTIONS",
	])("runs a %s without checking the origin", async (method) => {
		const response = await route(ok)(bffRequest(method), undefined);

		expect(response.status).toBe(200);
	});

	it("marks success and failure responses Cache-Control: no-store", async () => {
		const success = await route(ok)(bffRequest("GET"), undefined);
		const failure = await route(() => Promise.reject(new ApiError(404)))(
			bffRequest("GET"),
			undefined,
		);

		expect(success.headers.get("Cache-Control")).toBe("no-store");
		expect(failure.headers.get("Cache-Control")).toBe("no-store");
	});

	it("answers 500 { error: 'unexpected' } when a handler throws something that is not an ApiError", async () => {
		const response = await route(() =>
			Promise.reject(new Error("database password in this message")),
		)(bffRequest("GET"), undefined);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({ error: "unexpected" });
	});

	it("passes Retry-After through to the browser", async () => {
		const response = errorResponse(
			new ApiError(429, { error: "code.rate-limited" }, "60"),
		);

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("60");
	});
});

describe("readBody() and parseUpstream()", () => {
	const Schema = z.object({
		name: z.string({ error: "tenantName.required" }),
	});

	function jsonRequest(body: string, contentType = "application/json") {
		return new NextRequest(`${WEB_ORIGIN}/api/anything`, {
			method: "POST",
			headers: { "content-type": contentType },
			body,
		});
	}

	it("accepts application/json with parameters", async () => {
		await expect(
			readBody(
				jsonRequest('{"name":"Ana"}', "application/json; charset=utf-8"),
				Schema,
			),
		).resolves.toEqual({ name: "Ana" });
	});

	it("refuses another content type with 415", async () => {
		const error = await rejection(
			readBody(jsonRequest("name=Ana", "text/plain"), Schema),
		);

		expect(error.status).toBe(415);
	});

	it("refuses malformed JSON with 400", async () => {
		const error = await rejection(readBody(jsonRequest("{name"), Schema));

		expect(error.status).toBe(400);
	});

	it("reports the first invalid field with its error key", async () => {
		const error = await rejection(readBody(jsonRequest("{}"), Schema));

		expect(error.status).toBe(400);
		expect(error.body).toEqual({ error: "tenantName.required", field: "name" });
	});

	it("hides a validation message that is not an error key behind 'unexpected'", async () => {
		const Plain = z.object({ name: z.string() });

		const error = await rejection(readBody(jsonRequest("{}"), Plain));

		expect(error.body).toEqual({ error: "unexpected", field: "name" });
	});

	it("turns an upstream body of the wrong shape into a 502", () => {
		expect(() => parseUpstream(Schema, { other: true })).toThrow(ApiError);
		try {
			parseUpstream(Schema, { other: true });
		} catch (error) {
			expect((error as ApiError).status).toBe(502);
		}
	});
});
