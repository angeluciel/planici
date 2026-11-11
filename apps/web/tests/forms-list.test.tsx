// W-list: SPEC-0001 AC-0001-17, -52, -53, -54, -78
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormsList } from "@/app/[lang]/(private)/orgs/[tenant]/forms/_components/forms-list";
import {
	callsTo,
	never,
	on,
	renderApp,
	resetApi,
	setRoute,
	stubFetch,
	summary,
	t,
} from "./forms-harness";

vi.mock("axios", async (importOriginal) => {
	const mod = await importOriginal<typeof import("axios")>();
	const harness = await import("./forms-harness");
	harness.installAxiosAdapter(mod.default, mod.AxiosError);
	return mod;
});
vi.mock("@/i18n/navigation", async () =>
	(await import("./forms-harness")).i18nNavigationMock(),
);
vi.mock("next/navigation", async () =>
	(await import("./forms-harness")).nextNavigationMock(),
);

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function rowOf(name: string) {
	const row = screen
		.getAllByRole("listitem")
		.find((li) => within(li).queryByText(name));
	if (!row) throw new Error(`no row for ${name}`);
	return row;
}

describe("FormsList", () => {
	it("AC-0001-17 hides archived templates until 'Mostrar arquivados' is on", async () => {
		const all = [
			summary({ name: "Ficha" }),
			summary({ name: "Antigo", status: "archived" }),
		];
		on("GET", "/api/forms", (call) => ({
			status: 200,
			body: {
				forms:
					call.query.get("includeArchived") === "true"
						? all
						: all.filter((f) => f.status === "active"),
			},
		}));

		renderApp(<FormsList />);

		await screen.findByText("Ficha");
		expect(screen.queryByText("Antigo")).toBeNull();

		fireEvent.click(screen.getByLabelText(t("list.showArchived")));

		await screen.findByText("Antigo");
		expect(screen.getByText("Ficha")).toBeTruthy();
		expect(
			within(rowOf("Antigo")).getByText(t("list.archivedBadge")),
		).toBeTruthy();
		expect(
			within(rowOf("Ficha")).queryByText(t("list.archivedBadge")),
		).toBeNull();
	});

	it("AC-0001-52 groups by type and lists client templates in the API order anamnese, Ética, Ficha", async () => {
		on("GET", "/api/forms", {
			status: 200,
			body: {
				forms: [
					summary({ name: "anamnese" }),
					summary({ name: "Ética" }),
					summary({ name: "Ficha" }),
					summary({ name: "Serviço", type: "service" }),
				],
			},
		});

		renderApp(<FormsList />);

		await screen.findByText("Ficha");
		const names = screen
			.getAllByRole("listitem")
			.map((li) => li.textContent ?? "");
		const order = ["anamnese", "Ética", "Ficha", "Serviço"].map((n) =>
			names.findIndex((text) => text.includes(n)),
		);
		expect(order.every((i) => i >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);

		const clients = screen.getByRole("heading", {
			name: t("list.groupClient"),
		});
		const services = screen.getByRole("heading", {
			name: t("list.groupService"),
		});
		const follows = (a: Node, b: Node) =>
			Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
		expect(follows(clients, screen.getByText("anamnese"))).toBe(true);
		expect(follows(screen.getByText("Ficha"), services)).toBe(true);
		expect(follows(services, screen.getByText("Serviço"))).toBe(true);
	});

	it("AC-0001-53 shows the empty copy with a Novo button in a type group without templates", async () => {
		on("GET", "/api/forms", {
			status: 200,
			body: { forms: [summary({ name: "Ficha" })] },
		});

		renderApp(<FormsList />);

		await screen.findByText("Ficha");
		const empty = await screen.findByText(t("list.empty", { type: "service" }));
		const services = screen.getByRole("heading", {
			name: t("list.groupService"),
		});
		const follows = (a: Node, b: Node) =>
			Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
		expect(follows(services, empty)).toBe(true);
		const novo = [
			...screen.queryAllByRole("button", { name: t("actions.new") }),
			...screen.queryAllByRole("link", { name: t("actions.new") }),
		];
		expect(novo.some((el) => follows(services, el))).toBe(true);
		expect(screen.queryByText(t("list.empty", { type: "client" }))).toBeNull();
	});

	it("AC-0001-54 shows the error copy with a retry button that requests the list again", async () => {
		let attempt = 0;
		on("GET", "/api/forms", () =>
			++attempt === 1
				? { status: 500, body: { error: "unexpected" } }
				: {
						status: 200,
						body: { forms: [summary({ name: "Ficha" })] },
					},
		);

		renderApp(<FormsList />);

		await screen.findByText(t("list.error"));
		expect(callsTo("GET", "/api/forms")).toHaveLength(1);

		fireEvent.click(screen.getByRole("button", { name: t("actions.retry") }));

		await screen.findByText("Ficha");
		expect(callsTo("GET", "/api/forms")).toHaveLength(2);
		expect(screen.queryByText(t("list.error"))).toBeNull();
	});

	it("AC-0001-78 shows skeleton rows named by the loading copy while the list is pending", async () => {
		on("GET", "/api/forms", never);

		renderApp(<FormsList />);

		const loading = await screen
			.findAllByLabelText(t("list.loading"))
			.catch(() => screen.findAllByText(t("list.loading")));
		expect(loading.length).toBeGreaterThan(0);
		expect(screen.queryByText("Ficha")).toBeNull();
	});
});
