// W-list: SPEC-0004 AC-0004-01 (menu part), -02, -03, -12 (badge), -18, -19, -48,
// -49, -53, -62, -63 and AC-0001-10 (the menu link to /forms/new?from=clients).
// The BFF transport is faked by clients-harness; the page runs with the real
// adapter and messages.
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientsList } from "@/app/[lang]/(private)/orgs/[tenant]/clients/_components/clients-list";
import {
	callsTo,
	clientRow,
	EMPTY_LIST,
	navigatedTo,
	never,
	on,
	renderApp,
	resetApi,
	serveClientTemplates,
	serveList,
	setRoute,
	settle,
	stubFetch,
	summary,
	tc,
} from "./clients-harness";

vi.mock("axios", async (importOriginal) => {
	const mod = await importOriginal<typeof import("axios")>();
	const harness = await import("./clients-harness");
	harness.installAxiosAdapter(mod.default, mod.AxiosError);
	return mod;
});
vi.mock("@/i18n/navigation", async () =>
	(await import("./clients-harness")).i18nNavigationMock(),
);
vi.mock("next/navigation", async () =>
	(await import("./clients-harness")).nextNavigationMock(),
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

// ------------------------------------------------------------------ helpers

const press = (target: Element) => {
	fireEvent.pointerDown(target);
	fireEvent.click(target);
};

const novoButton = () =>
	screen.findByRole("button", { name: tc("new.button") });

async function openMenu() {
	press(await novoButton());
	return screen.findByRole("menu");
}

/** The menu's items and dividers, in document order. */
function menuEntries(menu: HTMLElement): string[] {
	return Array.from(
		menu.querySelectorAll('[role="menuitem"], [role="separator"]'),
	).map((el) =>
		el.getAttribute("role") === "separator"
			? "---"
			: (el.textContent ?? "").trim(),
	);
}

const rowOf = (name: string) => {
	const row = screen
		.getAllByRole("row")
		.find((r) => within(r).queryByText(name));
	if (!row) throw new Error(`no row for ${name}`);
	return row;
};

const searchBox = () => screen.getByLabelText(tc("list.search"));
const typeSearch = (value: string) =>
	fireEvent.change(searchBox(), { target: { value } });
const listCalls = () => callsTo("GET", "/api/clients");
const retryButton = () =>
	screen.findByRole("button", { name: tc("form.retry") });

async function chooseStatus(label: string) {
	press(await screen.findByRole("radio", { name: label }));
}

// ------------------------------------------------------------- [Novo] menu

describe("[Novo] menu", () => {
	it("AC-0004-01 (menu part) shows 'Criar novo modelo', a divider, then the default template 'Cliente'", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([summary({ name: "Cliente" })]);
		renderApp(<ClientsList />);

		const menu = await openMenu();

		await within(menu).findByRole("menuitem", { name: "Cliente" });
		expect(menuEntries(menu)).toEqual([
			tc("new.createTemplate"),
			"---",
			"Cliente",
		]);
	});

	it("AC-0004-02 lists 'Criar novo modelo', then only the active client templates in the order the API returns them", async () => {
		const seen: URLSearchParams[] = [];
		serveList(EMPTY_LIST);
		// the API orders by name_key; archived and service templates are not client templates
		serveClientTemplates(
			[
				summary({ name: "Anamnese" }),
				summary({ name: "Ficha" }),
				summary({ name: "Antigo", status: "archived" }),
				summary({ name: "Serviço", type: "service" }),
			],
			seen,
		);
		renderApp(<ClientsList />);

		const menu = await openMenu();

		await within(menu).findByRole("menuitem", { name: "Ficha" });
		expect(menuEntries(menu)).toEqual([
			tc("new.createTemplate"),
			"---",
			"Anamnese",
			"Ficha",
		]);
		expect(seen.length).toBeGreaterThan(0);
		for (const query of seen) {
			expect(query.get("type")).toBe("client");
			expect(query.get("includeArchived")).not.toBe("true");
		}
	});

	it("AC-0004-03 shows only 'Criar novo modelo' and the no-templates hint when no client template is active", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([
			summary({ name: "Antigo", status: "archived" }),
			summary({ name: "Serviço", type: "service" }),
		]);
		renderApp(<ClientsList />);

		const menu = await openMenu();

		await screen.findByText(tc("new.noTemplates"));
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual([tc("new.createTemplate")]);
	});

	it("AC-0001-10 sends 'Criar novo modelo' to /forms/new?from=clients", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([summary({ name: "Cliente" })]);
		renderApp(<ClientsList />);
		const menu = await openMenu();
		const item = await within(menu).findByRole("menuitem", {
			name: tc("new.createTemplate"),
		});

		// either a link or a navigation on select
		let target = item.closest("a")?.getAttribute("href") ?? null;
		if (target === null) {
			press(item);
			await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
			target = navigatedTo().at(-1) ?? "";
		}

		expect(target).toContain("/forms/new?from=clients");
	});
});

// -------------------------------------------------------------- list states

describe("List states", () => {
	it("AC-0004-18 shows the empty state and a Novo button when the tenant has no clients", async () => {
		serveList(() => EMPTY_LIST); // also answers the status=all&limit=1 check
		serveClientTemplates([]);
		renderApp(<ClientsList />);

		await screen.findByText(tc("list.empty"));
		expect(await novoButton()).toBeTruthy();
		expect(screen.queryByText(tc("list.emptyFilter"))).toBeNull();
	});

	it("AC-0004-62 shows 'emptyFilter', not 'empty', when the only client is inactive and the filter is the default", async () => {
		serveList((query) =>
			query.get("status") === "all"
				? {
						clients: [clientRow("Ana Souza", { status: "inactive" })],
						nextCursor: null,
					}
				: EMPTY_LIST,
		);
		serveClientTemplates([]);
		renderApp(<ClientsList />);

		await screen.findByText(tc("list.emptyFilter"));
		expect(screen.queryByText(tc("list.empty"))).toBeNull();
	});

	it("AC-0004-19 shows the error state with a retry control when the list request fails with 500, and retry loads the list", async () => {
		let fail = true;
		serveList(() =>
			fail ? 500 : { clients: [clientRow("Ana Souza")], nextCursor: null },
		);
		serveClientTemplates([]);
		renderApp(<ClientsList />);

		await screen.findByText(tc("list.error"));
		fail = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Ana Souza");
		expect(screen.queryByText(tc("list.error"))).toBeNull();
	});

	it("AC-0004-49 shows skeleton rows with the loading copy before the list has loaded", async () => {
		on("GET", "/api/clients", never);
		serveClientTemplates([]);
		renderApp(<ClientsList />);

		const marker = await screen
			.findAllByLabelText(tc("list.loading"))
			.catch(() => screen.findAllByText(tc("list.loading")));
		expect(marker.length).toBeGreaterThan(0);
		expect(screen.queryByText(tc("list.empty"))).toBeNull();
	});

	it("AC-0004-12 (badge) shows the 'Inativo' badge on rows of the Inativos filter, which sends status=inactive", async () => {
		serveList((query) =>
			query.get("status") === "inactive"
				? {
						clients: [clientRow("Ana Souza", { status: "inactive" })],
						nextCursor: null,
					}
				: { clients: [clientRow("Bruno Lima")], nextCursor: null },
		);
		serveClientTemplates([]);
		renderApp(<ClientsList />);
		await screen.findByText("Bruno Lima");
		expect(screen.queryByText(tc("list.inactiveBadge"))).toBeNull();
		// the status filter is on the page with "Ativos" chosen by default
		expect(
			(
				screen.getByRole("radio", {
					name: tc("list.status.active"),
				}) as HTMLInputElement
			).checked,
		).toBe(true);

		await chooseStatus(tc("list.status.inactive"));

		await screen.findByText("Ana Souza");
		expect(
			within(rowOf("Ana Souza")).getByText(tc("list.inactiveBadge")),
		).toBeTruthy();
		expect(screen.queryByText("Bruno Lima")).toBeNull();
		expect(listCalls().some((c) => c.query.get("status") === "inactive")).toBe(
			true,
		);
	});
});

// ------------------------------------------------------------------- search

describe("Search", () => {
	it("AC-0004-48 names the query in the no-results state when the search finds nothing", async () => {
		serveList((query) =>
			query.get("q") === "zzz"
				? EMPTY_LIST
				: {
						clients: [clientRow("Ana Souza"), clientRow("Bruno Lima")],
						nextCursor: null,
					},
		);
		serveClientTemplates([]);
		renderApp(<ClientsList />);
		await screen.findByText("Ana Souza");

		typeSearch("zzz");

		await screen.findByText(tc("list.noResults", { q: "zzz" }));
		expect(listCalls().some((c) => c.query.get("q") === "zzz")).toBe(true);
		expect(screen.queryByText("Bruno Lima")).toBeNull();
	});

	it("AC-0004-53 sends no search request and shows the hint when the box holds one character", async () => {
		serveList({ clients: [clientRow("Ana Souza")], nextCursor: null });
		serveClientTemplates([]);
		renderApp(<ClientsList />);
		await screen.findByText("Ana Souza");
		const before = listCalls().length;

		typeSearch("a");
		await settle(); // longer than the 300 ms debounce

		expect(screen.getByText(tc("list.searchHint"))).toBeTruthy();
		expect(listCalls()).toHaveLength(before);
		expect(listCalls().every((c) => !c.query.get("q"))).toBe(true);
	});
});

// ---------------------------------------------------------------- load more

describe("Carregar mais", () => {
	const page = (from: number, count: number) =>
		Array.from({ length: count }, (_, i) =>
			clientRow(`Cliente ${String(from + i).padStart(3, "0")}`),
		);

	it("AC-0004-63 keeps the 50 loaded rows and shows the load-more error with a retry when the next page fails with 500; retry loads it", async () => {
		let failNext = true;
		const second = page(50, 20);
		serveList((query) => {
			if (query.get("after") === null)
				return { clients: page(0, 50), nextCursor: "cursor-1" };
			if (failNext) return 500;
			return { clients: second, nextCursor: null };
		});
		serveClientTemplates([]);
		renderApp(<ClientsList />);
		await screen.findByText("Cliente 000");

		fireEvent.click(
			await screen.findByRole("button", { name: tc("list.loadingMore") }),
		);

		await screen.findByText(tc("list.loadMoreError"));
		expect(screen.getAllByText(/^Cliente \d{3}$/)).toHaveLength(50);
		expect(listCalls().some((c) => c.query.get("after") === "cursor-1")).toBe(
			true,
		);

		failNext = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Cliente 069");
		expect(screen.getAllByText(/^Cliente \d{3}$/)).toHaveLength(70);
		expect(screen.queryByText(tc("list.loadMoreError"))).toBeNull();
	});
});
