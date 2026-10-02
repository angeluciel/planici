import type { Tenant } from "@planici/schemas";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TenantGate } from "@/app/[lang]/(private)/orgs/[tenant]/tenant-gate";
import { selectTenant } from "@/lib/api/tenants";

const replace = vi.fn();
const PATHNAME = "/orgs/studio-ana-4f9k2m7x1q/clients";

vi.mock("@/lib/api/tenants", () => ({ selectTenant: vi.fn() }));
vi.mock("@/lib/form", () => ({ useFieldError: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
	useRouter: () => ({ replace }),
	usePathname: () => PATHNAME,
}));
vi.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NEXT_NOT_FOUND");
	},
}));

class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
	state: { error?: Error } = {};
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	render() {
		return this.state.error ? this.state.error.message : this.props.children;
	}
}

const tenant: Tenant = {
	id: "studio-ana-4f9k2m7x1q",
	name: "Studio Ana",
	slug: "studio-ana",
	status: "active",
	plan: "free",
	role: "owner",
	trialStartedAt: null,
	createdAt: "2026-09-01T12:00:00.000Z",
};

function renderGate() {
	return render(
		<Boundary>
			<TenantGate tenantId={tenant.id}>
				<p>clients page</p>
			</TenantGate>
		</Boundary>,
	);
}

afterEach(() => {
	cleanup();
	vi.mocked(selectTenant).mockReset();
	replace.mockReset();
});

describe("TenantGate", () => {
	it("selects the tenant from the URL, then renders the page", async () => {
		vi.mocked(selectTenant).mockResolvedValue({ ok: true, tenant });

		renderGate();

		expect(screen.queryByText("clients page")).toBeNull();
		await screen.findByText("clients page");
		expect(selectTenant).toHaveBeenCalledWith(tenant.id);
	});

	it("is a 404 when the caller has no access to the tenant", async () => {
		vi.mocked(selectTenant).mockResolvedValue({
			ok: false,
			error: "tenant.not-found",
		});

		renderGate();

		await screen.findByText("NEXT_NOT_FOUND");
		expect(screen.queryByText("clients page")).toBeNull();
	});

	it("sends a signed out user to login and back", async () => {
		vi.mocked(selectTenant).mockResolvedValue({
			ok: false,
			error: "session.expired",
		});

		renderGate();

		await waitFor(() =>
			expect(replace).toHaveBeenCalledWith({
				pathname: "/login",
				query: { next: PATHNAME },
			}),
		);
		expect(screen.queryByText("clients page")).toBeNull();
	});

	it("shows other failures instead of the page", async () => {
		vi.mocked(selectTenant).mockResolvedValue({
			ok: false,
			error: "network.unavailable",
		});

		renderGate();

		await screen.findByText("network.unavailable");
		expect(screen.queryByText("clients page")).toBeNull();
	});
});
