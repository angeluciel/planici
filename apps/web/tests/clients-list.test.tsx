// W-list: SPEC-0004 AC-0004-01 (menu part), -02, -03, -12 (badge), -18, -19, -48,
// -49, -53, -62 and AC-0001-10 (the menu link to /forms/new?from=clients), and
// SPEC-0006 AC-0006-08 to -15, -19 to -21, -28 to -33, -35 to -41, -43 to -52,
// -58 to -68. The BFF transport is faked by clients-harness; the page runs with
// the real adapter, the real Query client factory and the real messages.
import type { ClientSummary } from "@planici/schemas";
import {
	act,
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
	listReply,
	navigatedTo,
	never,
	on,
	renderClients,
	resetApi,
	restoreBrowserZone,
	restoreClientsScreen,
	serveClientTemplates,
	serveList,
	setBrowserZone,
	setClientsScreen,
	setRoute,
	settle,
	spyScrollTo,
	stubFetch,
	stubIntersection,
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

let io: ReturnType<typeof stubIntersection>;
let scrollTo: ReturnType<typeof spyScrollTo>;

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({});
	io = stubIntersection();
	scrollTo = spyScrollTo();
	// the matchMedia fake must exist before the page mounts, or the layout hook
	// has nothing to subscribe to and misses a later change (G-2)
	setClientsScreen("wide");
});
afterEach(() => {
	cleanup();
	scrollTo.mockRestore();
	vi.unstubAllGlobals();
	restoreClientsScreen();
	restoreBrowserZone();
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

/** The row (wide) or card (narrow) of a client: the list item that shows the name. */
const rowOf = (name: string) => {
	const row = screen
		.getAllByRole("listitem")
		.find((r) => within(r).queryByText(name));
	if (!row) throw new Error(`no row for ${name}`);
	return row;
};

/** The texts of an element's leaves, in order: badges and fields, no wrappers. */
const leafTexts = (el: HTMLElement) =>
	Array.from(el.querySelectorAll("*"))
		.filter((e) => e.children.length === 0)
		.map((e) => (e.textContent ?? "").trim())
		.filter((text) => text !== "");

const searchBox = () => screen.getByLabelText(tc("list.search"));
const typeSearch = (value: string) =>
	fireEvent.change(searchBox(), { target: { value } });
const listCalls = () => callsTo("GET", "/api/clients");
const pageCalls = () =>
	listCalls().filter((c) => c.query.get("after") !== null);
const lastList = () => {
	const last = listCalls().at(-1);
	if (!last) throw new Error("no list request");
	return last.query;
};
const retryButton = () =>
	screen.findByRole("button", { name: tc("form.retry") });

async function chooseStatus(label: string) {
	press(await screen.findByRole("radio", { name: label }));
}

// A toolbar picker is a menu button named "<label>: <current choice>".
const pickerName = (label: string) => (name: string) =>
	name.startsWith(`${label}:`);
const picker = (label: string) =>
	screen.findByRole("button", { name: pickerName(label) });
const queryPicker = (label: string) =>
	screen.queryByRole("button", { name: pickerName(label) });

async function choose(label: string, option: string) {
	press(await picker(label));
	press(await screen.findByRole("menuitemradio", { name: option }));
}

const total = () => screen.queryByText(/^\d+ clientes?$/);
const personRows = () =>
	screen.queryAllByText(/^(Cliente|Recente|Ana|Maria|Zeca) \d{3}$/);
const loadingMarks = () =>
	screen
		.queryAllByLabelText(tc("list.loading"))
		.concat(screen.queryAllByText(tc("list.loading")));

/** Reports the last loaded row in view, once the page has observed one. */
const scrollToEnd = () => waitFor(() => expect(io.revealLast()).toBe(true));

const pad = (i: number) => String(i).padStart(3, "0");

/**
 * A dataset of `count` clients served 50 per page; the cursors are "c50",
 * "c100". `nameOf(i, query)` names the i-th row, so a test can tell the
 * response of one request from another's.
 */
function serveDataset(
	count: number,
	nameOf: (i: number, query: URLSearchParams) => string = (i) =>
		`Cliente ${pad(i)}`,
) {
	const cache = new Map<string, ClientSummary>();
	const rowAt = (i: number, query: URLSearchParams) => {
		const name = nameOf(i, query);
		let row = cache.get(name);
		if (!row) {
			row = clientRow(name);
			cache.set(name, row);
		}
		return row;
	};
	serveList((query) => {
		const after = query.get("after");
		const start = after === null ? 0 : Number(after.slice(1));
		const end = Math.min(start + 50, count);
		return listReply(
			Array.from({ length: end - start }, (_, i) => rowAt(start + i, query)),
			end < count ? `c${end}` : null,
			count,
		);
	});
}

/** Page 1 shown (50 rows). */
async function renderFirstPage(count = 120) {
	serveDataset(count);
	serveClientTemplates([]);
	const view = renderClients(<ClientsList />);
	await screen.findByText("Cliente 049");
	return view;
}

/** Headings (single letters) and names in document order, for the narrow list. */
function letterSequence(names: string[]): string[] {
	const out: string[] = [];
	for (const el of document.querySelectorAll(
		'h1, h2, h3, h4, h5, h6, [role="heading"], a',
	)) {
		const text = (el.textContent ?? "").trim();
		const isHeading = el.tagName !== "A";
		const keep = isHeading ? text.length === 1 : names.includes(text);
		if (keep && out.at(-1) !== text) out.push(text);
	}
	return out;
}

// ------------------------------------------------------------- [Novo] menu

describe("[Novo] menu", () => {
	it("AC-0004-01 (menu part) shows 'Criar novo modelo', a divider, then the default template 'Cliente'", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([summary({ name: "Cliente" })]);
		renderClients(<ClientsList />);

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
		renderClients(<ClientsList />);

		const menu = await openMenu();

		await within(menu).findByRole("menuitem", { name: "Ficha" });
		// the menu lists only the active templates, although the request also
		// brings the archived ones for the Modelo control (SPEC-0006 G-1)
		expect(menuEntries(menu)).toEqual([
			tc("new.createTemplate"),
			"---",
			"Anamnese",
			"Ficha",
		]);
		expect(seen.length).toBeGreaterThan(0);
		for (const query of seen) {
			expect(query.get("type")).toBe("client");
		}
	});

	it("AC-0004-03 shows only 'Criar novo modelo' and the no-templates hint when no client template is active", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([
			summary({ name: "Antigo", status: "archived" }),
			summary({ name: "Serviço", type: "service" }),
		]);
		renderClients(<ClientsList />);

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
		renderClients(<ClientsList />);
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
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.empty"));
		expect(await novoButton()).toBeTruthy();
		expect(screen.queryByText(tc("list.emptyFilter"))).toBeNull();
	});

	it("AC-0004-62 shows 'emptyFilter', not 'empty', when the only client is inactive and the filter is the default", async () => {
		serveList((query) =>
			query.get("status") === "all"
				? listReply([clientRow("Ana Souza", { status: "inactive" })])
				: EMPTY_LIST,
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.emptyFilter"));
		expect(screen.queryByText(tc("list.empty"))).toBeNull();
	});

	it("AC-0004-19 shows the error state with a retry control when the list request fails with 500, and retry loads the list", async () => {
		let fail = true;
		serveList(() => (fail ? 500 : listReply([clientRow("Ana Souza")])));
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.error"));
		fail = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Ana Souza");
		expect(screen.queryByText(tc("list.error"))).toBeNull();
	});

	it("AC-0004-49 shows skeleton rows with the loading copy before the list has loaded", async () => {
		on("GET", "/api/clients", never);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		const marker = await screen
			.findAllByLabelText(tc("list.loading"))
			.catch(() => screen.findAllByText(tc("list.loading")));
		expect(marker.length).toBeGreaterThan(0);
		expect(screen.queryByText(tc("list.empty"))).toBeNull();
	});

	it("AC-0004-12 (badge) shows the 'Inativo' badge on rows of the Inativos filter, which sends status=inactive", async () => {
		serveList((query) =>
			query.get("status") === "inactive"
				? listReply([clientRow("Ana Souza", { status: "inactive" })])
				: listReply([clientRow("Bruno Lima")]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
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
				: listReply([clientRow("Ana Souza"), clientRow("Bruno Lima")]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		typeSearch("zzz");

		await screen.findByText(tc("list.noResults", { q: "zzz" }));
		expect(listCalls().some((c) => c.query.get("q") === "zzz")).toBe(true);
		expect(screen.queryByText("Bruno Lima")).toBeNull();
	});

	it("AC-0004-53 sends no search request and shows the hint when the box holds one character", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");
		const before = listCalls().length;

		typeSearch("a");
		await settle(); // longer than the 300 ms debounce

		expect(screen.getByText(tc("list.searchHint"))).toBeTruthy();
		expect(listCalls()).toHaveLength(before);
		expect(listCalls().every((c) => !c.query.get("q"))).toBe(true);
	});
});

// -------------------------------------------------------------- wide rows

describe("Wide rows", () => {
	it("AC-0006-08 a wide row shows initials, name, e-mail, phone and the template badge, with no column headers", async () => {
		serveList(
			listReply([
				clientRow("Ana Souza", {
					email: "ana@example.com",
					phone: "11987654321",
					formName: "Anamnese",
				}),
			]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		const row = rowOf("Ana Souza");

		expect(leafTexts(row)).toEqual(
			expect.arrayContaining([
				"AS",
				"Ana Souza",
				"ana@example.com",
				"(11) 98765-4321",
				"Anamnese",
			]),
		);
		expect(
			within(row).getByRole("link", { name: "Ana Souza" }).getAttribute("href"),
		).toContain("/clients/");
		expect(screen.queryByRole("table")).toBeNull();
		expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
	});

	it('AC-0006-09 a client without a phone has no phone line and no "—"', async () => {
		serveList(listReply([clientRow("Ana Souza", { phone: null })]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		const row = rowOf("Ana Souza");

		expect(row.textContent).not.toContain("—");
		expect(row.textContent).not.toMatch(/\(\d{2}\)/);
		expect(leafTexts(row)).toEqual(
			expect.arrayContaining(["AS", "Ana Souza", "ana.souza@example.com"]),
		);
	});

	it("AC-0006-65 an archived template's badge shows its name alone", async () => {
		serveList(listReply([clientRow("Carla Dias", { formName: "Antigo" })]));
		serveClientTemplates([summary({ name: "Antigo", status: "archived" })]);
		renderClients(<ClientsList />);
		await screen.findByText("Carla Dias");

		const row = rowOf("Carla Dias");

		expect(within(row).getByText("Antigo")).toBeTruthy();
		expect(row.textContent).not.toContain("(arquivado)");
	});

	it("AC-0006-66 a wide row shows Inativo right before the template badge", async () => {
		serveList((query) =>
			query.get("status") === "all"
				? listReply([
						clientRow("Ana Reis", { status: "inactive", formName: "Ficha" }),
					])
				: EMPTY_LIST,
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await chooseStatus(tc("list.status.all"));
		await screen.findByText("Ana Reis");

		const texts = leafTexts(rowOf("Ana Reis"));

		expect(texts).toContain(tc("list.inactiveBadge"));
		expect(texts.indexOf("Ficha")).toBe(
			texts.indexOf(tc("list.inactiveBadge")) + 1,
		);
	});
});

// ---------------------------------------------------------- Modelo control

describe("Modelo control", () => {
	const anamnese = summary({ name: "Anamnese" });
	const ficha = summary({ name: "Ficha" });

	it("AC-0006-10 offers Todos os modelos, then client templates by name, archived marked", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		// the API's order: name_key; "Corte" is a service template
		serveClientTemplates([
			anamnese,
			summary({ name: "Antigo", status: "archived" }),
			ficha,
			summary({ name: "Corte", type: "service" }),
		]);
		renderClients(<ClientsList />);

		press(await picker(tc("list.filter.form")));

		await screen.findAllByRole("menuitemradio");
		expect(
			screen.getAllByRole("menuitemradio").map((o) => o.textContent?.trim()),
		).toEqual([
			tc("list.filter.allForms"),
			"Anamnese",
			tc("list.filter.archivedForm", { name: "Antigo" }),
			"Ficha",
		]);
	});

	it("AC-0006-11 shows no Modelo control with a single client template", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([summary({ name: "Cliente" })]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");
		await waitFor(() =>
			expect(callsTo("GET", "/api/forms").length).toBeGreaterThan(0),
		);
		await settle(100);

		expect(queryPicker(tc("list.filter.form"))).toBeNull();
	});

	it('AC-0006-12 choosing a template sends q and formId without after and shows "1 cliente"', async () => {
		serveList((query) =>
			query.get("formId") === anamnese.id
				? listReply([clientRow("Ana Souza")])
				: listReply([
						clientRow("Ana Souza"),
						clientRow("Bruno Lima", { formId: ficha.id }),
					]),
		);
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Bruno Lima");
		typeSearch("souza");
		await waitFor(() =>
			expect(listCalls().some((c) => c.query.get("q") === "souza")).toBe(true),
		);

		await choose(tc("list.filter.form"), "Anamnese");

		await waitFor(() => expect(screen.queryByText("Bruno Lima")).toBeNull());
		const query = lastList();
		expect(query.get("q")).toBe("souza");
		expect(query.get("formId")).toBe(anamnese.id);
		expect(query.get("after")).toBeNull();
		expect(await screen.findByText("1 cliente")).toBeTruthy();
		expect(screen.getByText("Ana Souza")).toBeTruthy();
	});

	it("AC-0006-13 choosing Todos os modelos drops formId", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");
		await choose(tc("list.filter.form"), "Anamnese");
		await waitFor(() => expect(lastList().get("formId")).toBe(anamnese.id));

		await choose(tc("list.filter.form"), tc("list.filter.allForms"));

		await waitFor(() => expect(lastList().get("formId")).toBeNull());
	});

	it("AC-0006-14 shows emptyFilter under a template with no clients", async () => {
		serveList((query) =>
			query.get("formId") === anamnese.id
				? EMPTY_LIST
				: listReply([clientRow("Ana Souza", { formId: ficha.id })]),
		);
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		await choose(tc("list.filter.form"), "Anamnese");

		await screen.findByText(tc("list.emptyFilter"));
		expect(screen.queryByText(tc("list.empty"))).toBeNull();
	});

	it("AC-0006-15 hides the Modelo control when templates fail and still lists", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		on("GET", "/api/forms", { status: 500, body: { error: "unexpected" } });
		renderClients(<ClientsList />);

		await screen.findByText("Ana Souza");
		await waitFor(() =>
			expect(callsTo("GET", "/api/forms").length).toBeGreaterThan(0),
		);
		await settle(100);

		expect(queryPicker(tc("list.filter.form"))).toBeNull();
	});

	it("AC-0006-39 hides the Modelo control while templates load", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		on("GET", "/api/forms", never);
		renderClients(<ClientsList />);

		await screen.findByText("Ana Souza");

		expect(queryPicker(tc("list.filter.form"))).toBeNull();
	});
});

// ------------------------------------------------------------------- total

describe("Total", () => {
	it('AC-0006-19 keeps "120 clientes" after the second page loads', async () => {
		await renderFirstPage(120);
		await screen.findByText("120 clientes");

		await scrollToEnd();
		await screen.findByText("Cliente 099");

		expect(screen.getByText("120 clientes")).toBeTruthy();
	});

	it("§4.3 step 2 the total follows the latest page", async () => {
		serveList((query) =>
			query.get("after") === null
				? listReply(
						Array.from({ length: 50 }, (_, i) =>
							clientRow(`Cliente ${pad(i)}`),
						),
						"c50",
						120,
					)
				: listReply(
						Array.from({ length: 20 }, (_, i) =>
							clientRow(`Cliente ${pad(50 + i)}`),
						),
						null,
						121,
					),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("120 clientes");

		await scrollToEnd();

		expect(await screen.findByText("121 clientes")).toBeTruthy();
		expect(screen.queryByText("120 clientes")).toBeNull();
	});

	it('AC-0006-20 shows "1 cliente"', async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		expect(await screen.findByText("1 cliente")).toBeTruthy();
	});

	it("AC-0006-21 shows no total and no closing block in the no-clients state", async () => {
		serveList(EMPTY_LIST);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.empty"));

		expect(total()).toBeNull();
		expect(screen.queryByText(tc("list.end"))).toBeNull();
	});

	it("AC-0006-36 shows no total in the error state", async () => {
		serveList(() => 500);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.error"));

		expect(total()).toBeNull();
	});

	it("AC-0006-37 shows no total and no closing block in the emptyFilter state", async () => {
		serveList((query) =>
			query.get("status") === "all"
				? listReply([clientRow("Ana Souza", { status: "inactive" })])
				: EMPTY_LIST,
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.emptyFilter"));

		expect(total()).toBeNull();
		expect(screen.queryByText(tc("list.end"))).toBeNull();
	});

	it("AC-0006-38 shows no total in the noResults state", async () => {
		serveList((query) =>
			query.get("q") === "zzz"
				? EMPTY_LIST
				: listReply([clientRow("Ana Souza"), clientRow("Bruno Lima")]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		typeSearch("zzz");

		await screen.findByText(tc("list.noResults", { q: "zzz" }));
		expect(total()).toBeNull();
	});
});

// -------------------------------------------------------------------- sort

describe("Sort", () => {
	const anamnese = summary({ name: "Anamnese" });
	const ficha = summary({ name: "Ficha" });

	it("AC-0006-28 the sort control shows Nome (A–Z) and offers the three sorts in order", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		const control = await picker(tc("list.sort.label"));

		expect(control.textContent).toContain(tc("list.sort.nameAsc"));
		press(control);
		await screen.findAllByRole("menuitemradio");
		expect(
			screen.getAllByRole("menuitemradio").map((o) => o.textContent?.trim()),
		).toEqual([
			tc("list.sort.nameAsc"),
			tc("list.sort.nameDesc"),
			tc("list.sort.updatedAt"),
		]);
	});

	it("AC-0006-29 Nome (Z–A) sends -name and Nome (A–Z) sends name", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		await choose(tc("list.sort.label"), tc("list.sort.nameDesc"));
		await waitFor(() => expect(lastList().get("sort")).toBe("-name"));
		expect((await picker(tc("list.sort.label"))).textContent).toContain(
			tc("list.sort.nameDesc"),
		);

		await choose(tc("list.sort.label"), tc("list.sort.nameAsc"));
		await waitFor(() => expect(lastList().get("sort")).toBe("name"));
		expect((await picker(tc("list.sort.label"))).textContent).toContain(
			tc("list.sort.nameAsc"),
		);
	});

	it("AC-0006-30 Última atualização sends -updatedAt", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));

		await waitFor(() => expect(lastList().get("sort")).toBe("-updatedAt"));
		expect((await picker(tc("list.sort.label"))).textContent).toContain(
			tc("list.sort.updatedAt"),
		);
	});

	it("AC-0006-31 a sort change keeps search and filters and restarts at the first page", async () => {
		serveDataset(120, (i, query) =>
			query.get("sort") === "-updatedAt"
				? `Recente ${pad(i)}`
				: `Cliente ${pad(i)}`,
		);
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");
		typeSearch("ana");
		await chooseStatus(tc("list.status.all"));
		await choose(tc("list.filter.form"), "Anamnese");
		await waitFor(() => expect(lastList().get("formId")).toBe(anamnese.id));
		await screen.findByText("Cliente 049");
		await scrollToEnd();
		await screen.findByText("Cliente 099");

		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));

		await screen.findByText("Recente 049");
		const query = lastList();
		expect(query.get("q")).toBe("ana");
		expect(query.get("status")).toBe("all");
		expect(query.get("formId")).toBe(anamnese.id);
		expect(query.get("sort")).toBe("-updatedAt");
		expect(query.get("after")).toBeNull();
		expect(personRows()).toHaveLength(50);
	});

	it("AC-0006-32 a new visit sends no sort and shows Nome (A–Z)", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		const first = renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");
		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));
		await waitFor(() => expect(lastList().get("sort")).toBe("-updatedAt"));
		first.unmount();
		const before = listCalls().length;

		renderClients(<ClientsList />, { client: first.client });

		await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
		expect(listCalls()[before]?.query.get("sort")).toBeNull();
		expect((await picker(tc("list.sort.label"))).textContent).toContain(
			tc("list.sort.nameAsc"),
		);
	});

	it("AC-0006-33 shows skeleton rows and no total while a sort change loads", async () => {
		on("GET", "/api/clients", (call) =>
			call.query.get("sort") === "-updatedAt"
				? never()
				: { status: 200, body: listReply([clientRow("Ana Souza")]) },
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));

		await waitFor(() => expect(loadingMarks().length).toBeGreaterThan(0));
		expect(total()).toBeNull();
		expect(screen.queryByText("Ana Souza")).toBeNull();
	});
});

// ----------------------------------------------------------- infinite scroll

describe("Infinite scroll", () => {
	const anamnese = summary({ name: "Anamnese" });
	const ficha = summary({ name: "Ficha" });

	it("AC-0006-35 the next page sends sort, formId and the cursor", async () => {
		serveDataset(120, (i, query) =>
			query.get("sort") === "-updatedAt"
				? `Recente ${pad(i)}`
				: `Cliente ${pad(i)}`,
		);
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");
		await choose(tc("list.filter.form"), "Anamnese");
		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));
		await screen.findByText("Recente 049");

		await scrollToEnd();

		await waitFor(() => expect(pageCalls().length).toBeGreaterThan(0));
		const query = pageCalls().at(-1)?.query;
		expect(query?.get("sort")).toBe("-updatedAt");
		expect(query?.get("formId")).toBe(anamnese.id);
		expect(query?.get("after")).toBe("c50");
	});

	it("AC-0006-43 the 50th row in view loads the next page once and appends it", async () => {
		await renderFirstPage();
		const firstFifty = personRows().map((el) => el.textContent);
		expect(firstFifty).toHaveLength(50);

		await scrollToEnd();

		await screen.findByText("Cliente 099");
		expect(pageCalls()).toHaveLength(1);
		expect(pageCalls()[0]?.query.get("after")).toBe("c50");
		const all = personRows().map((el) => el.textContent);
		expect(all).toHaveLength(100);
		expect(all.slice(0, 50)).toEqual(firstFifty);
	});

	it("AC-0006-44 Tab to the 50th name loads the next page", async () => {
		await renderFirstPage();

		const link = screen.getByRole("link", { name: "Cliente 049" });
		act(() => link.focus());

		await waitFor(() => expect(pageCalls().length).toBeGreaterThan(0));
		expect(pageCalls()[0]?.query.get("after")).toBe("c50");
	});

	it("AC-0006-45 a failed next page keeps the rows, sends nothing until retry, and retry loads it", async () => {
		let failNext = true;
		const first = Array.from({ length: 50 }, (_, i) =>
			clientRow(`Cliente ${pad(i)}`),
		);
		const second = Array.from({ length: 50 }, (_, i) =>
			clientRow(`Cliente ${pad(50 + i)}`),
		);
		serveList((query) => {
			if (query.get("after") === null) return listReply(first, "c50", 120);
			return failNext ? 500 : listReply(second, "c100", 120);
		});
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");

		await scrollToEnd();

		await screen.findByText(tc("list.loadMoreError"));
		expect(personRows()).toHaveLength(50);
		expect(pageCalls()).toHaveLength(1);
		// past Query's first default retry delay (1 s): a list query that kept
		// the default retries would have sent a second request by now
		await settle(1200);
		io.revealLast();
		await settle(100);
		expect(pageCalls()).toHaveLength(1);

		failNext = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Cliente 099");
		expect(pageCalls()).toHaveLength(2);
		expect(personRows()).toHaveLength(100);
		expect(screen.queryByText(tc("list.loadMoreError"))).toBeNull();
	});

	it("AC-0006-46 shows loadingMore and sends no second request while a page loads", async () => {
		const first = Array.from({ length: 50 }, (_, i) =>
			clientRow(`Cliente ${pad(i)}`),
		);
		on("GET", "/api/clients", (call) =>
			call.query.get("after") === null
				? { status: 200, body: listReply(first, "c50", 120) }
				: never(),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");

		await scrollToEnd();

		await screen.findByText(tc("list.loadingMore"));
		io.revealLast();
		await settle(100);
		expect(pageCalls()).toHaveLength(1);
	});

	it("AC-0006-47 shows the closing block after the third page and sends nothing more", async () => {
		await renderFirstPage();
		await scrollToEnd();
		await screen.findByText("Cliente 099");
		await scrollToEnd();
		await screen.findByText("Cliente 119");

		await screen.findByText(tc("list.end"));
		expect(screen.queryByText(tc("list.loadingMore"))).toBeNull();
		io.revealLast();
		await settle(100);

		expect(pageCalls()).toHaveLength(2);
	});

	it("AC-0006-48 shows the closing block under a single short page", async () => {
		serveList(
			listReply([
				clientRow("Ana Souza"),
				clientRow("Bruno Lima"),
				clientRow("Carla Dias"),
			]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		await screen.findByText(tc("list.end"));

		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(pageCalls()).toHaveLength(0);
	});

	it("AC-0006-49 shows no closing block in the noResults state", async () => {
		serveList((query) =>
			query.get("q") === "zzz"
				? EMPTY_LIST
				: listReply([clientRow("Ana Souza"), clientRow("Bruno Lima")]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText(tc("list.end"));

		typeSearch("zzz");

		await screen.findByText(tc("list.noResults", { q: "zzz" }));
		expect(screen.queryByText(tc("list.end"))).toBeNull();
	});

	it('AC-0006-50 announces "100 de 120 clientes carregados" without moving focus', async () => {
		await renderFirstPage();
		const box = searchBox();
		act(() => box.focus());
		expect(screen.queryByText("100 de 120 clientes carregados")).toBeNull();

		await scrollToEnd();

		const message = await screen.findByText("100 de 120 clientes carregados");
		expect(message.closest('[aria-live="polite"]')).not.toBeNull();
		expect(document.activeElement).toBe(box);
	});

	it("AC-0006-51 shows no Carregar mais button", async () => {
		await renderFirstPage();

		expect(screen.queryByRole("button", { name: /carregar mais/i })).toBeNull();
	});

	it("AC-0006-52 the closing illustration is hidden from assistive technology", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([]);
		renderClients(<ClientsList />);

		const message = await screen.findByText(tc("list.end"));

		const block = message.parentElement as HTMLElement;
		expect(message.closest('[aria-hidden="true"]')).toBeNull();
		expect(block.querySelector(':scope > [aria-hidden="true"]')).not.toBeNull();
		const audible = Array.from(block.children)
			.filter((child) => child.getAttribute("aria-hidden") !== "true")
			.map((child) => child.textContent?.trim())
			.join("");
		expect(audible).toBe(tc("list.end"));
	});

	it("AC-0006-58 a status change scrolls the list back to the top", async () => {
		await renderFirstPage();
		await scrollToEnd();
		await screen.findByText("Cliente 099");
		scrollTo.mockClear();

		await chooseStatus(tc("list.status.all"));

		await waitFor(() =>
			expect(scrollTo).toHaveBeenCalledWith(
				expect.objectContaining({ top: 0 }),
			),
		);
		await screen.findByText("Cliente 049");
		expect(lastList().get("after")).toBeNull();
		expect(personRows()).toHaveLength(50);
	});

	it("AC-0006-68 coming back to the list starts at the top with the first page", async () => {
		serveDataset(120);
		serveClientTemplates([]);
		const first = renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");
		await scrollToEnd();
		await screen.findByText("Cliente 099");
		first.unmount();
		// one macrotask: gcTime 0 collects the query
		await new Promise((resolve) => setTimeout(resolve, 0));
		const before = listCalls().length;
		scrollTo.mockClear();

		renderClients(<ClientsList />, { client: first.client });

		await screen.findByText("Cliente 049");
		await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
		expect(listCalls()[before]?.query.get("after")).toBeNull();
		expect(screen.queryByText("Cliente 099")).toBeNull();
		expect(personRows()).toHaveLength(50);
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
	});
});

// ----------------------------------------------------------- narrow screens

describe("Narrow screens", () => {
	const anamnese = summary({ name: "Anamnese" });
	const ficha = summary({ name: "Ficha" });

	it("AC-0006-40 narrow: search, status and total; no sort or Modelo control; no sort or formId sent", async () => {
		setClientsScreen("narrow");
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);

		await screen.findByText("Ana Souza");

		expect(searchBox()).toBeTruthy();
		expect(
			screen.getByRole("radio", { name: tc("list.status.active") }),
		).toBeTruthy();
		expect(await screen.findByText("1 cliente")).toBeTruthy();
		await waitFor(() =>
			expect(callsTo("GET", "/api/forms").length).toBeGreaterThan(0),
		);
		await settle(100);
		expect(queryPicker(tc("list.sort.label"))).toBeNull();
		expect(queryPicker(tc("list.filter.form"))).toBeNull();
		expect(listCalls().length).toBeGreaterThan(0);
		for (const call of listCalls()) {
			expect(call.query.get("sort")).toBeNull();
			expect(call.query.get("formId")).toBeNull();
		}
	});

	it("AC-0006-41 narrowing drops sort and formId, keeps q and status, and goes back to the top", async () => {
		serveDataset(60, (i, query) =>
			query.get("sort") === null ? `Cliente ${pad(i)}` : `Recente ${pad(i)}`,
		);
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Cliente 049");
		typeSearch("ana");
		await choose(tc("list.filter.form"), "Anamnese");
		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));
		await screen.findByText("Recente 049");
		scrollTo.mockClear();
		const before = listCalls().length;

		setClientsScreen("narrow");

		await screen.findByText("Cliente 049");
		const query = listCalls()[before]?.query;
		expect(query?.get("q")).toBe("ana");
		expect(query?.get("status")).toBe("active");
		expect(query?.get("sort")).toBeNull();
		expect(query?.get("formId")).toBeNull();
		expect(query?.get("after")).toBeNull();
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
	});

	it("R8 narrowing with the default sort and no template reloads the first page and scrolls up", async () => {
		await renderFirstPage();
		await scrollToEnd();
		await screen.findByText("Cliente 099");
		scrollTo.mockClear();
		const before = listCalls().length;

		setClientsScreen("narrow");

		await waitFor(() => expect(personRows()).toHaveLength(50));
		expect(listCalls()).toHaveLength(before + 1);
		expect(listCalls()[before]?.query.get("after")).toBeNull();
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
	});

	it("AC-0006-64 widening restores the wide sort and template", async () => {
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([anamnese, ficha]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");
		await choose(tc("list.filter.form"), "Anamnese");
		await choose(tc("list.sort.label"), tc("list.sort.updatedAt"));
		await waitFor(() => expect(lastList().get("sort")).toBe("-updatedAt"));
		setClientsScreen("narrow");
		await waitFor(() => expect(lastList().get("sort")).toBeNull());
		const before = listCalls().length;

		setClientsScreen("wide");

		await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
		const query = lastList();
		expect(query.get("sort")).toBe("-updatedAt");
		expect(query.get("formId")).toBe(anamnese.id);
		expect(query.get("after")).toBeNull();
		expect((await picker(tc("list.sort.label"))).textContent).toContain(
			tc("list.sort.updatedAt"),
		);
		expect((await picker(tc("list.filter.form"))).textContent).toContain(
			"Anamnese",
		);
	});

	it('AC-0006-59 narrow card shows initials, name, e-mail, "02/08" and the template badge, no phone', async () => {
		setBrowserZone("America/Sao_Paulo");
		setClientsScreen("narrow");
		const year = new Date().getUTCFullYear();
		serveList(
			listReply([
				clientRow("Ana Souza", {
					email: "ana@example.com",
					phone: null,
					formName: "Anamnese",
					updatedAt: `${year}-08-02T15:00:00.000Z`,
				}),
			]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		const card = rowOf("Ana Souza");

		expect(leafTexts(card)).toEqual(
			expect.arrayContaining([
				"AS",
				"Ana Souza",
				"ana@example.com",
				"02/08",
				"Anamnese",
			]),
		);
		expect(card.textContent).not.toMatch(/\(\d{2}\)/);
	});

	it("Q26 the card date uses the browser's time zone, not the provider's", async () => {
		// the provider's zone is UTC (renderClients); 01:00 UTC on 3 August is
		// 22:00 on 2 August in São Paulo
		setBrowserZone("America/Sao_Paulo");
		setClientsScreen("narrow");
		const year = new Date().getUTCFullYear();
		serveList(
			listReply([
				clientRow("Ana Souza", { updatedAt: `${year}-08-03T01:00:00.000Z` }),
			]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		const card = rowOf("Ana Souza");

		expect(within(card).getByText("02/08")).toBeTruthy();
		expect(within(card).queryByText("03/08")).toBeNull();
	});

	it("AC-0006-60 narrow headings A, E, J group by letter ignoring case and accents", async () => {
		setClientsScreen("narrow");
		// the API's order: name_key, which ignores case and accents
		serveList(
			listReply([
				clientRow("ana Reis"),
				clientRow("Eduardo Reis"),
				clientRow("Érica Dias"),
				clientRow("João Lima"),
			]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("João Lima");

		expect(
			letterSequence(["ana Reis", "Eduardo Reis", "Érica Dias", "João Lima"]),
		).toEqual([
			"A",
			"ana Reis",
			"E",
			"Eduardo Reis",
			"Érica Dias",
			"J",
			"João Lima",
		]);
		expect(screen.getAllByRole("heading", { name: "E" })).toHaveLength(1);
	});

	it("AC-0006-61 a page starting with the same letter adds no second heading", async () => {
		setClientsScreen("narrow");
		serveDataset(120, (i) =>
			i < 49 ? `Ana ${pad(i)}` : i < 51 ? `Maria ${pad(i)}` : `Zeca ${pad(i)}`,
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("Maria 049");
		expect(screen.getAllByRole("heading", { name: "M" })).toHaveLength(1);

		await scrollToEnd();

		await screen.findByText("Maria 050");
		expect(screen.getAllByRole("heading", { name: "M" })).toHaveLength(1);
	});

	it('AC-0006-62 a name not starting with a letter goes under "#"', async () => {
		setClientsScreen("narrow");
		serveList(
			listReply([clientRow("7 Mares Estética"), clientRow("Ana Reis")]),
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await screen.findByText("7 Mares Estética");

		expect(letterSequence(["7 Mares Estética", "Ana Reis"])).toEqual([
			"#",
			"7 Mares Estética",
			"A",
			"Ana Reis",
		]);
	});

	it("AC-0006-63 the floating Novo cliente button opens the Novo menu; no top Novo button", async () => {
		setClientsScreen("narrow");
		serveList(listReply([clientRow("Ana Souza")]));
		serveClientTemplates([summary({ name: "Ficha" })]);
		renderClients(<ClientsList />);
		await screen.findByText("Ana Souza");

		press(await screen.findByRole("button", { name: tc("new.floating") }));

		const menu = await screen.findByRole("menu");
		await within(menu).findByRole("menuitem", { name: "Ficha" });
		expect(menuEntries(menu)).toEqual([
			tc("new.createTemplate"),
			"---",
			"Ficha",
		]);
		expect(screen.queryByRole("button", { name: tc("new.button") })).toBeNull();
	});

	it("AC-0006-67 a narrow card shows Inativo right before the template badge", async () => {
		setClientsScreen("narrow");
		serveList((query) =>
			query.get("status") === "all"
				? listReply([
						clientRow("Ana Reis", { status: "inactive", formName: "Ficha" }),
					])
				: EMPTY_LIST,
		);
		serveClientTemplates([]);
		renderClients(<ClientsList />);
		await chooseStatus(tc("list.status.all"));
		await screen.findByText("Ana Reis");

		const texts = leafTexts(rowOf("Ana Reis"));

		expect(texts).toContain(tc("list.inactiveBadge"));
		expect(texts.indexOf("Ficha")).toBe(
			texts.indexOf(tc("list.inactiveBadge")) + 1,
		);
	});
});
