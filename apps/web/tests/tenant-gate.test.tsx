import type { Tenant } from "@planici/schemas";
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TenantGate } from "@/app/[lang]/(private)/orgs/[tenant]/tenant-gate";
import { selectTenant } from "@/lib/api/tenants";
import {
	ANA_ID,
	atelieDuda,
	clinicaBia,
	renderShell,
	resetShell,
	studioAna,
} from "./shell-harness";

const replace = vi.fn();
const PATHNAME = "/orgs/studio-ana-4f9k2m7x1q/clients";

vi.mock("@/lib/api/tenants", () => ({ selectTenant: vi.fn() }));
vi.mock("@/lib/form", () => {
	const fieldError = (key: string) => key;
	return { useFieldError: () => fieldError };
});
// Link, params and the rest of the navigation the shell's header needs come
// from the shared harness (SPEC-0008); the router and the path stay this file's.
vi.mock("@/i18n/navigation", async () => ({
	...(await import("./forms-harness")).i18nNavigationMock(),
	useRouter: () => ({ replace }),
	usePathname: () => PATHNAME,
}));
vi.mock("next/navigation", async () =>
	(await import("./forms-harness")).nextNavigationMock(),
);

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
	resetShell();
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

	it("AC-0008-11 the header names the organization the gate selected after the id changes", async () => {
		const byId = new Map([
			[studioAna.id, studioAna],
			[clinicaBia.id, clinicaBia],
		]);
		vi.mocked(selectTenant).mockImplementation(async (id) => {
			const found = byId.get(id);
			return found
				? { ok: true, tenant: found }
				: { ok: false, error: "tenant.not-found" };
		});

		const view = renderShell({ tenantId: ANA_ID });
		const first = await screen.findByRole("link", {
			name: "Studio Ana, ver todas as organizações",
		});
		expect(within(first).getByText("S")).toBeTruthy();

		view.changeTenant(clinicaBia.id);

		const second = await screen.findByRole("link", {
			name: "Clínica Bia, ver todas as organizações",
		});
		expect(within(second).getByText("C")).toBeTruthy();
		expect(
			screen.queryByRole("link", {
				name: "Studio Ana, ver todas as organizações",
			}),
		).toBeNull();
		expect(selectTenant).toHaveBeenLastCalledWith(clinicaBia.id);
	});

	it("AC-0008-19 another user's organization is a 404 and no header is rendered", async () => {
		vi.mocked(selectTenant).mockResolvedValue({
			ok: false,
			error: "tenant.not-found",
		});

		renderShell({ tenantId: atelieDuda.id });

		await screen.findByText("NEXT_NOT_FOUND");
		expect(screen.queryByRole("banner")).toBeNull();
		expect(screen.queryByText(/Ateliê Duda/)).toBeNull();
		expect(screen.queryByText("page")).toBeNull();
	});
});
