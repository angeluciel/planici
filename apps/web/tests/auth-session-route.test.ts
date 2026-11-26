// @vitest-environment node
// SPEC-0008 AC-0008-28, -29 and -51: sign-out at the BFF. Describes behavior as
// built (DELETE /api/auth/session); the web header's "Sair" relies on it. Only
// the upstream call `api` is faked; WEB_APP_URL is set with vi.stubEnv.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/app/api/_lib/http";
import { DELETE } from "@/app/api/auth/session/route";

vi.mock("@/app/api/_lib/http", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/app/api/_lib/http")>()),
	api: vi.fn(),
}));

const WEB_ORIGIN = "http://localhost:3000";
const REFRESH_TOKEN = "refresh-token-of-ana";
const SESSION_COOKIES = ["token", "refreshToken", "rememberMe", "tenantId"];

function signOutRequest() {
	return new NextRequest(`${WEB_ORIGIN}/api/auth/session`, {
		method: "DELETE",
		headers: {
			origin: WEB_ORIGIN,
			cookie: [
				"token=access-token-of-ana",
				`refreshToken=${REFRESH_TOKEN}`,
				"rememberMe=1",
				"tenantId=studio-ana-4f9k2m7x1q",
			].join("; "),
		},
	});
}

function expectEverySessionCookieCleared(response: Response) {
	const cleared = (
		response as unknown as {
			cookies: {
				get: (name: string) => { value: string; maxAge?: number } | undefined;
			};
		}
	).cookies;
	for (const name of SESSION_COOKIES) {
		const cookie = cleared.get(name);
		expect(cookie, `${name} cookie is set to clear`).toBeDefined();
		expect(cookie?.value).toBe("");
		expect(cookie?.maxAge).toBe(0);
	}
}

beforeEach(() => {
	vi.stubEnv("WEB_APP_URL", WEB_ORIGIN);
	vi.mocked(api).mockResolvedValue(null);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.mocked(api).mockReset();
});

describe("DELETE /api/auth/session", () => {
	it("AC-0008-51 DELETE /api/auth/session sends the refreshToken cookie to the upstream logout", async () => {
		await DELETE(signOutRequest(), undefined);

		expect(api).toHaveBeenCalledTimes(1);
		expect(api).toHaveBeenCalledWith("/logout", {
			body: { refreshToken: REFRESH_TOKEN },
		});
	});

	it("AC-0008-28 DELETE /api/auth/session answers 204 and clears the token, refreshToken, rememberMe and tenantId cookies", async () => {
		const response = await DELETE(signOutRequest(), undefined);

		expect(response.status).toBe(204);
		expectEverySessionCookieCleared(response);
	});

	it("AC-0008-29 an upstream logout failure still clears every session cookie", async () => {
		vi.mocked(api).mockRejectedValue(new ApiError(500));

		const response = await DELETE(signOutRequest(), undefined);

		expect(response.status).toBe(500);
		expectEverySessionCookieCleared(response);
	});
});
