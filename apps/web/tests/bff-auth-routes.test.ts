// @vitest-environment node
// The auth BFF routes under /api/auth, and /api/health.
// Describes behavior as built: the API's tokens only ever reach the browser as
// httpOnly cookies, never in a body, and the session cookies are dropped when
// the API says the session is over. Sign-out (DELETE /api/auth/session) is
// covered in auth-session-route.test.ts; only its remaining cases are here.
// Only the upstream call `api` is faked; WEB_APP_URL is set with vi.stubEnv.
import type { AuthUser, SessionResponse } from "@planici/schemas";
import { NextRequest, type NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/app/api/_lib/http";
import * as availability from "@/app/api/auth/availability/route";
import * as emailCode from "@/app/api/auth/email/code/route";
import * as emailVerify from "@/app/api/auth/email/verify/route";
import * as me from "@/app/api/auth/me/route";
import * as forgot from "@/app/api/auth/password/forgot/route";
import * as reset from "@/app/api/auth/password/reset/route";
import * as refresh from "@/app/api/auth/refresh/route";
import * as register from "@/app/api/auth/register/route";
import * as session from "@/app/api/auth/session/route";
import * as health from "@/app/api/health/route";

vi.mock("@/app/api/_lib/http", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/api/_lib/http")>()),
	api: vi.fn(),
}));

const WEB_ORIGIN = "http://localhost:3000";
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const SESSION_COOKIES = ["token", "refreshToken", "rememberMe", "tenantId"];

const USER: AuthUser = {
	id: "0b6f1c1e-6a4e-4b8e-9a51-1f2d3c4b5a69",
	email: "ana@example.com",
	name: "Ana",
	surname: "Souza",
	slug: "ana-souza",
	displayName: "Ana Souza",
	avatarUrl: null,
	emailVerified: true,
};

const SESSION: SessionResponse = {
	accessToken: "new-access-token",
	refreshToken: "new-refresh-token",
	expiresIn: 900,
	user: USER,
};

const LOGIN = {
	provider: "email",
	email: "  Ana@Example.com ",
	password: "any-password",
};

const REGISTER = {
	email: "ana@example.com",
	name: "Ana",
	surname: "Souza",
	slug: "ana-souza",
	consent: {
		acceptedTerms: true,
		marketingOptIn: false,
		termsVersion: "2026-09",
		acceptedAt: "2026-11-01T12:00:00.000Z",
	},
	provider: "email",
	password: "s3nha-forte!",
	emailVerificationToken: "email-proof-token",
};

function bffRequest(
	method: string,
	path: string,
	options: { body?: unknown; cookies?: string[]; origin?: string | null } = {},
) {
	const { body, cookies = [], origin = WEB_ORIGIN } = options;
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

function cookie(response: NextResponse, name: string) {
	return response.cookies.get(name);
}

function expectSessionCookiesSet(response: NextResponse) {
	expect(cookie(response, "token")).toMatchObject({
		value: SESSION.accessToken,
		httpOnly: true,
		sameSite: "lax",
		path: "/",
	});
	expect(cookie(response, "refreshToken")).toMatchObject({
		value: SESSION.refreshToken,
		httpOnly: true,
	});
}

function expectNoCookieSet(response: NextResponse) {
	for (const name of SESSION_COOKIES) {
		expect(cookie(response, name), name).toBeUndefined();
	}
}

function expectEverySessionCookieCleared(response: NextResponse) {
	for (const name of SESSION_COOKIES) {
		expect(cookie(response, name), name).toMatchObject({
			value: "",
			maxAge: 0,
		});
	}
}

beforeEach(() => {
	vi.stubEnv("WEB_APP_URL", WEB_ORIGIN);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.mocked(api).mockReset();
});

describe("POST /api/auth/session (sign in)", () => {
	const signIn = (body: unknown) =>
		session.POST(bffRequest("POST", "/auth/session", { body }), undefined);

	it("sends the validated credentials to the API login", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		await signIn(LOGIN);

		expect(api).toHaveBeenCalledWith("/login", {
			body: {
				provider: "email",
				email: "ana@example.com",
				password: "any-password",
			},
		});
	});

	it("hands the tokens to the browser as httpOnly cookies, never in the body", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signIn(LOGIN);

		expect(response.status).toBe(200);
		const text = await response.text();
		expect(JSON.parse(text)).toEqual({ ok: true, user: USER });
		expect(text).not.toContain(SESSION.accessToken);
		expect(text).not.toContain(SESSION.refreshToken);
		expectSessionCookiesSet(response);
	});

	it("without rememberMe, sets session cookies that end with the browser", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signIn(LOGIN);

		expect(cookie(response, "token")?.maxAge).toBeUndefined();
		expect(cookie(response, "refreshToken")?.maxAge).toBeUndefined();
		expect(cookie(response, "rememberMe")?.value).toBe("0");
	});

	it("with rememberMe, keeps the access cookie for expiresIn and the refresh cookie for JWT_REFRESH_TTL", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signIn({ ...LOGIN, rememberMe: true });

		expect(cookie(response, "token")?.maxAge).toBe(SESSION.expiresIn);
		expect(cookie(response, "refreshToken")?.maxAge).toBe(THIRTY_DAYS);
		expect(cookie(response, "rememberMe")).toMatchObject({
			value: "1",
			maxAge: THIRTY_DAYS,
		});
	});

	it.each([
		["45s", 45],
		["15m", 900],
		["12h", 43_200],
		["7d", 604_800],
	])("reads JWT_REFRESH_TTL=%s as %i seconds", async (ttl, seconds) => {
		vi.stubEnv("JWT_REFRESH_TTL", ttl);
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signIn({ ...LOGIN, rememberMe: true });

		expect(cookie(response, "refreshToken")?.maxAge).toBe(seconds);
	});

	it.each([
		"30 days",
		"0d",
		"-1d",
		"1w",
	])("answers 500 and sets no cookie when JWT_REFRESH_TTL is %j", async (ttl) => {
		vi.stubEnv("JWT_REFRESH_TTL", ttl);
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signIn({ ...LOGIN, rememberMe: true });

		expect(response.status).toBe(500);
		expectNoCookieSet(response);
	});

	it("marks the cookies Secure in production only", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);
		const development = await signIn(LOGIN);
		vi.stubEnv("NODE_ENV", "production");
		const production = await signIn(LOGIN);

		expect(cookie(development, "token")?.secure).toBe(false);
		expect(cookie(production, "token")?.secure).toBe(true);
		expect(cookie(production, "refreshToken")?.secure).toBe(true);
	});

	it("forwards a Google sign-in with its id token", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		await signIn({ provider: "google", idToken: "google-id-token" });

		expect(api).toHaveBeenCalledWith("/login", {
			body: { provider: "google", idToken: "google-id-token" },
		});
	});

	it("refuses an invalid body with 400 before calling the API", async () => {
		const response = await signIn({ ...LOGIN, password: "" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "password.required",
			field: "password",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("passes wrong credentials through and sets no cookie", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(401, { error: "credentials.invalid" }),
		);

		const response = await signIn(LOGIN);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "credentials.invalid",
		});
		expectNoCookieSet(response);
	});

	it("turns a session reply of the wrong shape into a 502 and sets no cookie", async () => {
		vi.mocked(api).mockResolvedValue({ ...SESSION, accessToken: undefined });

		const response = await signIn(LOGIN);

		expect(response.status).toBe(502);
		expectNoCookieSet(response);
	});

	it("refuses a cross-site sign-in with 403", async () => {
		const response = await session.POST(
			bffRequest("POST", "/auth/session", {
				body: LOGIN,
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
	});
});

describe("DELETE /api/auth/session (sign out)", () => {
	it("skips the upstream logout without a refreshToken cookie and still clears the session", async () => {
		const response = await session.DELETE(
			bffRequest("DELETE", "/auth/session", { cookies: ["token=t"] }),
			undefined,
		);

		expect(api).not.toHaveBeenCalled();
		expect(response.status).toBe(204);
		expectEverySessionCookieCleared(response);
	});

	it("refuses a cross-site sign-out with 403 and keeps the session", async () => {
		const response = await session.DELETE(
			bffRequest("DELETE", "/auth/session", {
				cookies: ["token=t", "refreshToken=r"],
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
		expectNoCookieSet(response);
	});
});

describe("POST /api/auth/register", () => {
	const signUp = (body: unknown) =>
		register.POST(bffRequest("POST", "/auth/register", { body }), undefined);

	it("creates the account and starts a session that ends with the browser", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await signUp(REGISTER);

		expect(api).toHaveBeenCalledWith("/register", { body: REGISTER });
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual({ ok: true, user: USER });
		expectSessionCookiesSet(response);
		expect(cookie(response, "rememberMe")?.value).toBe("0");
		expect(cookie(response, "refreshToken")?.maxAge).toBeUndefined();
	});

	it("refuses a weak password with 400 before calling the API", async () => {
		const response = await signUp({ ...REGISTER, password: "short1!" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "password.min",
			field: "password",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("passes a taken email through and sets no cookie", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(409, { error: "email.taken", field: "email" }),
		);

		const response = await signUp(REGISTER);

		expect(response.status).toBe(409);
		expectNoCookieSet(response);
	});
});

describe("POST /api/auth/refresh", () => {
	const renew = (cookies: string[]) =>
		refresh.POST(bffRequest("POST", "/auth/refresh", { cookies }), undefined);

	it("sends the refreshToken cookie to the API and replaces the session cookies", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await renew(["token=old", "refreshToken=old-refresh"]);

		expect(api).toHaveBeenCalledWith("/refresh", {
			body: { refreshToken: "old-refresh" },
		});
		expect(response.status).toBe(200);
		expectSessionCookiesSet(response);
		expect(cookie(response, "rememberMe")?.value).toBe("0");
	});

	it("keeps a remembered session persistent", async () => {
		vi.mocked(api).mockResolvedValue(SESSION);

		const response = await renew(["refreshToken=old-refresh", "rememberMe=1"]);

		expect(cookie(response, "token")?.maxAge).toBe(SESSION.expiresIn);
		expect(cookie(response, "refreshToken")?.maxAge).toBe(THIRTY_DAYS);
	});

	it("answers 401 session.expired without a refreshToken cookie and clears the session", async () => {
		const response = await renew([
			"token=old",
			"tenantId=studio-ana-4f9k2m7x1q",
		]);

		expect(api).not.toHaveBeenCalled();
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "session.expired",
		});
		expectEverySessionCookieCleared(response);
	});

	it.each([
		401, 403,
	])("clears the session when the API refuses the refresh token with %i", async (status) => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(status, { error: "token.invalid" }),
		);

		const response = await renew(["refreshToken=old-refresh"]);

		expect(response.status).toBe(status);
		expectEverySessionCookieCleared(response);
	});

	it.each([
		500, 502, 504,
	])("keeps the session when the refresh fails with %i, so it can be retried", async (status) => {
		vi.mocked(api).mockRejectedValue(new ApiError(status));

		const response = await renew(["refreshToken=old-refresh"]);

		expect(response.status).toBe(status);
		expectNoCookieSet(response);
	});

	it("refuses a cross-site refresh with 403", async () => {
		const response = await refresh.POST(
			bffRequest("POST", "/auth/refresh", {
				cookies: ["refreshToken=old-refresh"],
				origin: "https://evil.example",
			}),
			undefined,
		);

		expect(response.status).toBe(403);
		expect(api).not.toHaveBeenCalled();
	});
});

describe("GET /api/auth/me", () => {
	it("reads the signed-in user with the token cookie", async () => {
		vi.mocked(api).mockResolvedValue(USER);

		const response = await me.GET(
			bffRequest("GET", "/auth/me", { cookies: ["token=access-token-of-ana"] }),
			undefined,
		);

		expect(api).toHaveBeenCalledWith("/me", {
			method: "GET",
			token: "access-token-of-ana",
		});
		await expect(response.json()).resolves.toEqual(USER);
	});

	it("answers 401 session.expired without a token cookie and never calls the API", async () => {
		const response = await me.GET(bffRequest("GET", "/auth/me"), undefined);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "session.expired",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("turns a user of the wrong shape into a 502", async () => {
		vi.mocked(api).mockResolvedValue({ ...USER, id: "not-a-uuid" });

		const response = await me.GET(
			bffRequest("GET", "/auth/me", { cookies: ["token=t"] }),
			undefined,
		);

		expect(response.status).toBe(502);
	});
});

describe("POST /api/auth/email/code", () => {
	const requestCode = (body: unknown) =>
		emailCode.POST(bffRequest("POST", "/auth/email/code", { body }), undefined);

	it("asks the API to send a code and answers 202 with no body", async () => {
		vi.mocked(api).mockResolvedValue(null);

		const response = await requestCode({ email: "Ana@Example.com" });

		expect(api).toHaveBeenCalledWith("/email/code", {
			body: { email: "ana@example.com" },
		});
		expect(response.status).toBe(202);
		expect(await response.text()).toBe("");
	});

	it("refuses an invalid email with 400 before calling the API", async () => {
		const response = await requestCode({ email: "ana" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "email.invalid",
			field: "email",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("passes the rate limit through with its Retry-After", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(429, { error: "code.rate-limited" }, "60"),
		);

		const response = await requestCode({ email: "ana@example.com" });

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("60");
	});
});

describe("POST /api/auth/email/verify", () => {
	const verify = (body: unknown) =>
		emailVerify.POST(
			bffRequest("POST", "/auth/email/verify", { body }),
			undefined,
		);

	it("returns the email proof the API issues for a valid code", async () => {
		const proof = {
			emailVerificationToken: "email-proof-token",
			expiresIn: 600,
		};
		vi.mocked(api).mockResolvedValue(proof);

		const response = await verify({ email: "ana@example.com", code: "123456" });

		expect(api).toHaveBeenCalledWith("/email/verify", {
			body: { email: "ana@example.com", code: "123456" },
		});
		await expect(response.json()).resolves.toEqual(proof);
	});

	it.each([
		"12345",
		"1234567",
		"12a456",
	])("refuses code %j with 400 code.length before calling the API", async (code) => {
		const response = await verify({ email: "ana@example.com", code });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "code.length",
			field: "code",
		});
		expect(api).not.toHaveBeenCalled();
	});
});

describe("POST /api/auth/password/forgot", () => {
	it("asks the API for a reset link and answers 202", async () => {
		vi.mocked(api).mockResolvedValue(null);

		const response = await forgot.POST(
			bffRequest("POST", "/auth/password/forgot", {
				body: { email: "ana@example.com" },
			}),
			undefined,
		);

		expect(api).toHaveBeenCalledWith("/password/forgot", {
			body: { email: "ana@example.com" },
		});
		expect(response.status).toBe(202);
	});

	it("refuses a missing email with 400 before calling the API", async () => {
		const response = await forgot.POST(
			bffRequest("POST", "/auth/password/forgot", { body: {} }),
			undefined,
		);

		expect(response.status).toBe(400);
		expect(api).not.toHaveBeenCalled();
	});
});

describe("POST /api/auth/password/reset", () => {
	const resetWith = (body: unknown) =>
		reset.POST(
			bffRequest("POST", "/auth/password/reset", {
				body,
				cookies: [
					"token=t",
					"refreshToken=r",
					"tenantId=studio-ana-4f9k2m7x1q",
				],
			}),
			undefined,
		);

	it("sets the new password, answers 204 and signs this browser out", async () => {
		vi.mocked(api).mockResolvedValue(null);

		const response = await resetWith({
			token: "reset-token",
			password: "n0va-senha!",
		});

		expect(api).toHaveBeenCalledWith("/password/reset", {
			body: { token: "reset-token", password: "n0va-senha!" },
		});
		expect(response.status).toBe(204);
		expectEverySessionCookieCleared(response);
	});

	it("refuses a password without a symbol with 400 before calling the API", async () => {
		const response = await resetWith({
			token: "reset-token",
			password: "novasenha1",
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "password.symbol",
			field: "password",
		});
		expect(api).not.toHaveBeenCalled();
	});

	it("keeps the session when the API refuses the reset token", async () => {
		vi.mocked(api).mockRejectedValue(
			new ApiError(400, { error: "token.expired" }),
		);

		const response = await resetWith({
			token: "reset-token",
			password: "n0va-senha!",
		});

		expect(response.status).toBe(400);
		expectNoCookieSet(response);
	});
});

describe("GET /api/auth/availability", () => {
	const check = (query: string) =>
		availability.GET(
			bffRequest("GET", `/auth/availability?${query}`),
			undefined,
		);

	it.each([
		["email=%20Ana%40Example.com", "/availability?email=ana%40example.com"],
		["slug=ana-souza", "/availability?slug=ana-souza"],
		["slug=ana-souza&token=x&tenantId=y", "/availability?slug=ana-souza"],
	])("forwards %j as %j with no token", async (query, upstreamPath) => {
		vi.mocked(api).mockResolvedValue({ available: false });

		const response = await check(query);

		expect(api).toHaveBeenCalledWith(upstreamPath, { method: "GET" });
		await expect(response.json()).resolves.toEqual({ available: false });
	});

	it.each([
		"",
		"email=ana%40example.com&slug=ana-souza",
	])("refuses %j (neither or both of email and slug) with 400", async (query) => {
		const response = await check(query);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: "unexpected" });
		expect(api).not.toHaveBeenCalled();
	});

	it("refuses a slug outside the pattern with 400 slug.pattern", async () => {
		const response = await check("slug=Ana%20Souza");

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "slug.pattern",
			field: "slug",
		});
	});
});

describe("GET /api/health", () => {
	it("answers ok without calling the API", async () => {
		const response = health.GET();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: "ok" });
		expect(api).not.toHaveBeenCalled();
	});
});
