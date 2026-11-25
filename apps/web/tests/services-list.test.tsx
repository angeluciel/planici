// W-slist: SPEC-0005 AC-0005-01, -02, -13 (wide badge), -18, -48 to -54, -57, -75
// on a wide screen, plus the wide-screen rules of §4.1 and R16 that carry no AC
// of their own. The BFF transport is faked by services-harness; the page runs
// with the real adapter, the real Query client factory and the real messages.
import type { ServiceSummary } from "@planici/schemas";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServicesList } from "@/app/[lang]/(private)/orgs/[tenant]/services/_components/services-list";
import {
	callsTo,
	EMPTY_LIST,
	leafTexts,
	listReply,
	menuEntries,
	navigatedTo,
	never,
	on,
	plain,
	press,
	renderServices,
	resetApi,
	restoreBrowserZone,
	restoreServicesScreen,
	rowOf,
	serveList,
	serveServiceTemplates,
	serviceRow,
	serviceTemplateSummary,
	setRoute,
	setServicesScreen,
	settle,
	spyScrollTo,
	stubFetch,
	stubIntersection,
	ts,
} from "./services-harness";

vi.mock("axios", async (importOriginal) => {
	const mod = await importOriginal<typeof import("axios")>();
	const harness = await import("./services-harness");
	harness.installAxiosAdapter(mod.default, mod.AxiosError);
	return mod;
});
vi.mock("@/i18n/navigation", async () =>
	(await import("./services-harness")).i18nNavigationMock(),
);
vi.mock("next/navigation", async () =>
	(await import("./services-harness")).nextNavigationMock(),
);

let io: ReturnType<typeof stubIntersection>;
let scrollTo: ReturnType<typeof spyScrollTo>;

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({});
	io = stubIntersection();
	scrollTo = spyScrollTo();
	// the matchMedia fake must exist before the page mounts (SPEC-0006 G-2)
	setServicesScreen("wide");
});
afterEach(() => {
	cleanup();
	scrollTo.mockRestore();
	vi.unstubAllGlobals();
	restoreServicesScreen();
	restoreBrowserZone();
});

// ------------------------------------------------------------------ helpers

const novoButton = () =>
	screen.findByRole("button", { name: ts("new.button") });

async function openMenu() {
	press(await novoButton());
	return screen.findByRole("menu");
}

const searchBox = () => screen.getByLabelText(ts("list.search"));
const typeSearch = (value: string) =>
	fireEvent.change(searchBox(), { target: { value } });
const listCalls = () => callsTo("GET", "/api/services");
const pageCalls = () =>
	listCalls().filter((c) => c.query.get("after") !== null);
const lastList = () => {
	const last = listCalls().at(-1);
	if (!last) throw new Error("no list request");
	return last.query;
};
const retryButton = () =>
	screen.findByRole("button", { name: ts("form.retry") });

async function chooseStatus(label: string) {
	press(await screen.findByRole("radio", { name: label }));
}

// A toolbar picker is a menu button named "<label>: <current choice>".
const picker = (label: string) =>
	screen.findByRole("button", {
		name: (name: string) => name.startsWith(`${label}:`),
	});
const queryPicker = (label: string) =>
	screen.queryByRole("button", {
		name: (name: string) => name.startsWith(`${label}:`),
	});

const sessionRows = () => screen.queryAllByText(/^Sessão \d{3}$/);
const pad = (i: number) => String(i).padStart(3, "0");
const scrollToEnd = () => waitFor(() => expect(io.revealLast()).toBe(true));

/** `count` services served 50 per page; cursors "c50", "c100". */
function serveDataset(count: number) {
	const rows: ServiceSummary[] = Array.from({ length: count }, (_, i) =>
		serviceRow(`Sessão ${pad(i)}`),
	);
	serveList((query) => {
		const after = query.get("after");
		const start = after === null ? 0 : Number(after.slice(1));
		const end = Math.min(start + 50, count);
		return listReply(
			rows.slice(start, end),
			end < count ? `c${end}` : null,
			count,
		);
	});
}

// ------------------------------------------------------------- [Novo] menu

describe("[Novo] menu", () => {
	it("AC-0005-01 shows 'Criar novo modelo', a divider, then the one template 'Serviço' of a new tenant", async () => {
		serveList(EMPTY_LIST);
		serveServiceTemplates([serviceTemplateSummary("Serviço")]);
		renderServices(<ServicesList />);

		const menu = await openMenu();

		await within(menu).findByRole("menuitem", { name: "Serviço" });
		expect(menuEntries(menu)).toEqual([
			ts("new.createTemplate"),
			"---",
			"Serviço",
		]);
	});

	it("AC-0005-02 lists 'Criar novo modelo', then only the active service templates, 'Serviço' and 'Sessão', in the order the API returns them", async () => {
		const seen: URLSearchParams[] = [];
		serveList(EMPTY_LIST);
		// the API orders by name_key; an archived service template and a client template are not offered
		serveServiceTemplates(
			[
				serviceTemplateSummary("Serviço"),
				serviceTemplateSummary("Sessão"),
				serviceTemplateSummary("Antigo", { status: "archived" }),
				serviceTemplateSummary("Ficha", { type: "client" }),
			],
			seen,
		);
		renderServices(<ServicesList />);

		const menu = await openMenu();

		await within(menu).findByRole("menuitem", { name: "Sessão" });
		expect(menuEntries(menu)).toEqual([
			ts("new.createTemplate"),
			"---",
			"Serviço",
			"Sessão",
		]);
		expect(seen.length).toBeGreaterThan(0);
		for (const query of seen) {
			expect(query.get("type")).toBe("service");
		}
	});

	it("AC-0005-51 shows only 'Criar novo modelo' and the no-templates hint when no service template is active", async () => {
		serveList(EMPTY_LIST);
		serveServiceTemplates([
			serviceTemplateSummary("Antigo", { status: "archived" }),
			serviceTemplateSummary("Ficha", { type: "client" }),
		]);
		renderServices(<ServicesList />);

		const menu = await openMenu();

		await screen.findByText(ts("new.noTemplates"));
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual([ts("new.createTemplate")]);
	});

	it("AC-0005-01 sends 'Criar novo modelo' to /forms/new?from=services, the editor shortcut with the type locked to service", async () => {
		serveList(EMPTY_LIST);
		serveServiceTemplates([serviceTemplateSummary("Serviço")]);
		renderServices(<ServicesList />);
		const menu = await openMenu();
		const item = await within(menu).findByRole("menuitem", {
			name: ts("new.createTemplate"),
		});

		// either a link or a navigation on select
		let target = item.closest("a")?.getAttribute("href") ?? null;
		if (target === null) {
			press(item);
			await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
			target = navigatedTo().at(-1) ?? "";
		}

		expect(target).toContain("/forms/new?from=services");
	});

	it("AC-0005-02 opens the fill-in page of the template that is chosen", async () => {
		const sessao = serviceTemplateSummary("Sessão");
		serveList(EMPTY_LIST);
		serveServiceTemplates([serviceTemplateSummary("Serviço"), sessao]);
		renderServices(<ServicesList />);
		const menu = await openMenu();

		press(await within(menu).findByRole("menuitem", { name: "Sessão" }));

		await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
		expect(navigatedTo().at(-1)).toContain(`/services/new?form=${sessao.id}`);
	});
});

// -------------------------------------------------------------- list states

describe("List states", () => {
	it("AC-0005-18 shows the empty state and a Novo button when the tenant has no services", async () => {
		serveList(() => EMPTY_LIST); // also answers the status=all&limit=1 check
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		await screen.findByText(ts("list.empty"));
		expect(await novoButton()).toBeTruthy();
		expect(screen.queryByText(ts("list.emptyFilter"))).toBeNull();
	});

	it("AC-0005-53 shows 'emptyFilter', not 'empty', when the only service is archived and the filter is the default", async () => {
		serveList((query) =>
			query.get("status") === "all"
				? listReply([serviceRow("Sessão individual", { status: "inactive" })])
				: EMPTY_LIST,
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		await screen.findByText(ts("list.emptyFilter"));
		expect(screen.queryByText(ts("list.empty"))).toBeNull();
	});

	it("AC-0005-48 shows skeleton rows with the loading copy before the list has loaded", async () => {
		on("GET", "/api/services", never);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		const marker = await screen
			.findAllByLabelText(ts("list.loading"))
			.catch(() => screen.findAllByText(ts("list.loading")));
		expect(marker.length).toBeGreaterThan(0);
		expect(screen.queryByText(ts("list.empty"))).toBeNull();
		expect(screen.queryByText(/^\d+ serviços?$/)).toBeNull();
	});

	it("AC-0005-49 shows the error state with a retry control when the list request fails with 500, and retry loads the list", async () => {
		let fail = true;
		serveList(() =>
			fail ? 500 : listReply([serviceRow("Sessão individual")]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		await screen.findByText(ts("list.error"));
		expect(screen.queryByText(/^\d+ serviços?$/)).toBeNull();
		fail = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Sessão individual");
		expect(screen.queryByText(ts("list.error"))).toBeNull();
	});

	it("AC-0005-50 names the query in the no-results state when the search finds nothing", async () => {
		serveList((query) =>
			query.get("q") === "zzz"
				? EMPTY_LIST
				: listReply([serviceRow("Avaliação"), serviceRow("Retorno")]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");

		typeSearch("zzz");

		await screen.findByText(ts("list.noResults", { q: "zzz" }));
		expect(listCalls().some((c) => c.query.get("q") === "zzz")).toBe(true);
		expect(screen.queryByText("Retorno")).toBeNull();
		expect(screen.queryByText(/^\d+ serviços?$/)).toBeNull();
	});

	it("AC-0005-52 sends no search request and shows the hint when the box holds one character", async () => {
		serveList(listReply([serviceRow("Avaliação")]));
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");
		const before = listCalls().length;

		typeSearch("a");
		await settle(); // longer than the 300 ms debounce

		expect(screen.getByText(ts("list.searchHint"))).toBeTruthy();
		expect(listCalls()).toHaveLength(before);
		expect(listCalls().every((c) => !c.query.get("q"))).toBe(true);
	});

	it("AC-0005-52 words the hint 'Digite ao menos 2 caracteres para buscar.'", () => {
		expect(ts("list.searchHint")).toBe(
			"Digite ao menos 2 caracteres para buscar.",
		);
	});

	it("AC-0005-54 keeps the first 50 rows and shows the load-more error with a retry when the next page fails with 500", async () => {
		let failNext = true;
		const rows = Array.from({ length: 120 }, (_, i) =>
			serviceRow(`Sessão ${pad(i)}`),
		);
		serveList((query) => {
			if (query.get("after") === null)
				return listReply(rows.slice(0, 50), "c50", 120);
			return failNext ? 500 : listReply(rows.slice(50, 100), "c100", 120);
		});
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Sessão 049");

		await scrollToEnd();

		await screen.findByText(ts("list.loadMoreError"));
		expect(sessionRows()).toHaveLength(50);
		expect(pageCalls()).toHaveLength(1);
		// no automatic request until the retry: past Query's first default retry delay (1 s)
		await settle(1200);
		io.revealLast();
		await settle(100);
		expect(pageCalls()).toHaveLength(1);

		failNext = false;
		fireEvent.click(await retryButton());

		await screen.findByText("Sessão 099");
		expect(sessionRows()).toHaveLength(100);
		expect(screen.queryByText(ts("list.loadMoreError"))).toBeNull();
	});

	it("AC-0005-75 shows the closing block below the last row of a short list", async () => {
		serveList(
			listReply([
				serviceRow("Avaliação"),
				serviceRow("Retorno"),
				serviceRow("Sessão"),
			]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Sessão");

		await scrollToEnd();

		const end = await screen.findByText(ts("list.end"));
		expect(end.textContent).toBe("Isso é tudo! Não há mais serviços por aqui.");
		const rows = screen.getAllByRole("listitem");
		expect(rows).toHaveLength(3);
		expect(
			(rows.at(-1) as HTMLElement).compareDocumentPosition(end) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(pageCalls()).toHaveLength(0);
	});

	it("AC-0005-75 shows the closing block after the third page and sends nothing more", async () => {
		serveDataset(120);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Sessão 049");
		await scrollToEnd();
		await screen.findByText("Sessão 099");
		await scrollToEnd();
		await screen.findByText("Sessão 119");

		await screen.findByText(ts("list.end"));
		io.revealLast();
		await settle(100);

		expect(pageCalls()).toHaveLength(2);
		expect(screen.queryByText(ts("list.loadingMore"))).toBeNull();
	});
});

// ---------------------------------------------------------------- wide rows

describe("Wide rows", () => {
	it("AC-0005-57 a wide row shows initials, the name, '1h 30min' and 'R$ 150,00' below it, and the template badge", async () => {
		serveList(
			listReply([
				serviceRow("Sessão individual", {
					durationMinutes: 90,
					priceCents: 15000,
					formName: "Serviço",
				}),
			]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Sessão individual");

		const row = rowOf("Sessão individual");

		const text = plain(row.textContent);
		expect(text).toContain("1h 30min");
		expect(text).toContain("R$ 150,00");
		// the duration and the price come below the name
		expect(text.indexOf("Sessão individual")).toBeLessThan(
			text.indexOf("1h 30min"),
		);
		expect(leafTexts(row)).toEqual(
			expect.arrayContaining(["SI", "Sessão individual", "Serviço"]),
		);
		expect(
			within(row)
				.getByRole("link", { name: "Sessão individual" })
				.getAttribute("href"),
		).toContain("/services/");
		expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
	});

	it("AC-0005-57 shows 'R$ 0,00' for a free service and the minutes alone under an hour", async () => {
		serveList(
			listReply([
				serviceRow("Avaliação", { durationMinutes: 45, priceCents: 0 }),
			]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");

		const text = plain(rowOf("Avaliação").textContent);

		expect(text).toContain("45min");
		expect(text).toContain("R$ 0,00");
	});

	it("AC-0005-13 shows the 'Arquivado' badge, right before the template badge, on the rows of the Arquivados filter, which sends status=inactive", async () => {
		serveList((query) =>
			query.get("status") === "inactive"
				? listReply([
						serviceRow("Sessão individual", {
							status: "inactive",
							formName: "Serviço",
						}),
					])
				: listReply([serviceRow("Retorno")]),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Retorno");
		expect(screen.queryByText(ts("list.inactiveBadge"))).toBeNull();
		expect(
			(screen.getByRole("radio", { name: "Ativos" }) as HTMLInputElement)
				.checked,
		).toBe(true);

		await chooseStatus("Arquivados");

		await screen.findByText("Sessão individual");
		const texts = leafTexts(rowOf("Sessão individual"));
		expect(texts).toContain("Arquivado");
		expect(ts("list.inactiveBadge")).toBe("Arquivado");
		expect(texts.indexOf("Serviço")).toBe(texts.indexOf("Arquivado") + 1);
		expect(screen.queryByText("Retorno")).toBeNull();
		expect(listCalls().some((c) => c.query.get("status") === "inactive")).toBe(
			true,
		);
	});
});

// ------------------------------------------------- wide controls and wording

describe("Wide controls (§4.1, R16)", () => {
	it("§4.1 step 7 titles the page 'Procedimentos/Consultas'", async () => {
		serveList(listReply([serviceRow("Avaliação")]));
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		const title = await screen.findByRole("heading", { level: 1 });

		expect(title.textContent).toBe("Procedimentos/Consultas");
	});

	it("R16 names the status filter 'Ativos', 'Arquivados' and 'Todos'", async () => {
		serveList(listReply([serviceRow("Avaliação")]));
		serveServiceTemplates([]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");

		expect(
			screen
				.getAllByRole("radio")
				.map((r) => r.closest("label")?.textContent?.trim()),
		).toEqual(["Ativos", "Arquivados", "Todos"]);
	});

	it("§4.1 step 3 shows the total as '1 serviço' and '12 serviços'", async () => {
		serveList((query) =>
			query.get("q") === "ava"
				? listReply([serviceRow("Avaliação")])
				: listReply([serviceRow("Avaliação"), serviceRow("Retorno")], null, 12),
		);
		serveServiceTemplates([]);
		renderServices(<ServicesList />);

		expect(await screen.findByText("12 serviços")).toBeTruthy();
		typeSearch("ava");

		expect(await screen.findByText("1 serviço")).toBeTruthy();
	});

	it("§4.1 step 4 offers the Modelo control with the service templates only, archived marked, and sends formId", async () => {
		const sessao = serviceTemplateSummary("Sessão");
		serveList(listReply([serviceRow("Avaliação")]));
		// the API's order: name_key; "Ficha" is a client template
		serveServiceTemplates([
			serviceTemplateSummary("Antigo", { status: "archived" }),
			serviceTemplateSummary("Ficha", { type: "client" }),
			serviceTemplateSummary("Serviço"),
			sessao,
		]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");

		press(await picker(ts("list.filter.form")));

		await screen.findAllByRole("menuitemradio");
		expect(
			screen.getAllByRole("menuitemradio").map((o) => o.textContent?.trim()),
		).toEqual([
			ts("list.filter.allForms"),
			"Antigo (arquivado)",
			"Serviço",
			"Sessão",
		]);
		expect(ts("list.filter.archivedForm", { name: "Antigo" })).toBe(
			"Antigo (arquivado)",
		);

		press(screen.getByRole("menuitemradio", { name: "Sessão" }));

		await waitFor(() => expect(lastList().get("formId")).toBe(sessao.id));
	});

	it("§4.1 step 4 shows no Modelo control with a single service template", async () => {
		serveList(listReply([serviceRow("Avaliação")]));
		serveServiceTemplates([serviceTemplateSummary("Serviço")]);
		renderServices(<ServicesList />);
		await screen.findByText("Avaliação");
		await waitFor(() =>
			expect(callsTo("GET", "/api/forms").length).toBeGreaterThan(0),
		);
		await settle(100);

		expect(queryPicker(ts("list.filter.form"))).toBeNull();
	});

	it("§4.1 step 5 words the messages 'Carregando mais serviços…' and 'Não foi possível carregar mais serviços.'", () => {
		expect(ts("list.loadingMore")).toBe("Carregando mais serviços…");
		expect(ts("list.loadMoreError")).toBe(
			"Não foi possível carregar mais serviços.",
		);
	});
});
