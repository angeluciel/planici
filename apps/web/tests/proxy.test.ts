// @vitest-environment node
// SPEC-0008 AC-0008-28, second half: once the session cookies are cleared, an
// organization page leads to sign-in. Describes behavior as built (src/proxy.ts).
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

// next-intl's middleware cannot be loaded under vitest in node (it imports
// "next/server" without an extension). The redirect asserted here is decided
// before the intl middleware runs, so it is replaced by a pass-through.
vi.mock("next-intl/middleware", async () => {
	const { NextResponse } = await import("next/server");
	return { default: () => () => NextResponse.next() };
});

const TENANT = "studio-ana-4f9k2m7x1q";

describe("proxy", () => {
	it("AC-0008-28 a request for an organization page without session cookies redirects to /login with next", async () => {
		const request = new NextRequest(
			`http://localhost:3000/pt-BR/orgs/${TENANT}/clients`,
		);

		const response = await proxy(request);

		expect(response.status).toBe(307);
		const location = new URL(response.headers.get("location") ?? "");
		expect(location.pathname).toBe("/pt-BR/login");
		expect(location.searchParams.get("next")).toBe(`/orgs/${TENANT}/clients`);
	});
});
