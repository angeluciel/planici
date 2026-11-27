// W-snarrow: SPEC-0005 R14 and R15 on a narrow screen (`matchMedia` narrow):
// AC-0005-85 to -90, -96 to -107, -113 to -115 and -117 to -119. AC-0005-99,
// -101 and -114 are verified partly: no appointment exists, so `hasHistory`
// comes from the faked list item and from a faked 409 (plan G-3, G-9).
//
// The page runs with the real adapter, the real shared list and the real
// SwipeRow; only `motion/react` is stubbed (swipe-row-stub.tsx), so a test opens
// a row by ending a drag with a chosen offset and velocity. The state behind the
// faked BFF is one `Backend` (services-harness): an archive, a reactivation or a
// delete shows in the next list and chips read.
//
// Contracts these tests hold the page to, beyond the copy keys of §8:
// - the chips are buttons carrying `aria-pressed` (true for the active chip); no
//   other button of the page carries `aria-pressed`; "Tentar novamente" is a
//   button without it; placeholder chips are `aria-hidden` and not buttons;
// - each service row is a list item that shows the name; a section header is a
//   heading other than the page title; the status dot carries
//   `data-status="active" | "inactive"`;
// - a swipe row's revealed actions are buttons hidden from assistive technology
//   while the row is closed (see swipe-row.test.tsx).
import type { ServiceSummary } from "@planici/schemas";
import {
	act,
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServicesList } from "@/app/[lang]/(private)/orgs/[tenant]/services/_components/services-list";
import {
	type Backend,
	backend,
	calls,
	callsTo,
	leafTexts,
	menuEntries,
	navigatedTo,
	plain,
	press,
	renderServices,
	resetApi,
	restoreServicesScreen,
	rowOf,
	serveBackend,
	serveServiceTemplates,
	servicePath,
	serviceRow,
	serviceTemplateSummary,
	setRoute,
	setServicesScreen,
	spyScrollTo,
	stubFetch,
	stubIntersection,
	ts,
} from "./services-harness";
import { dragEnd, draggableOf } from "./swipe-row-stub";

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
vi.mock("motion/react", async () =>
	(await import("./swipe-row-stub")).motionStub(),
);

let scrollTo: ReturnType<typeof spyScrollTo>;

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({});
	stubIntersection();
	scrollTo = spyScrollTo();
	setServicesScreen("narrow");
});
afterEach(() => {
	cleanup();
	scrollTo.mockRestore();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	restoreServicesScreen();
});

// ------------------------------------------------------------------ fixtures

const ESTETICOS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DERMATOLOGIA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LASER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TITLE = "Procedimentos/Consultas";

const template = (
	id: string,
	name: string,
	status: "active" | "archived" = "active",
) => ({ id, name, status });
const ESTETICOS_T = template(ESTETICOS, "Estéticos");
const DERMATOLOGIA_T = template(DERMATOLOGIA, "Dermatologia");
const LASER_T = template(LASER, "Laser");

const inEsteticos = (name: string, over: Partial<ServiceSummary> = {}) =>
	serviceRow(name, { formId: ESTETICOS, formName: "Estéticos", ...over });
const inDermatologia = (name: string, over: Partial<ServiceSummary> = {}) =>
	serviceRow(name, { formId: DERMATOLOGIA, formName: "Dermatologia", ...over });
const inLaser = (name: string, over: Partial<ServiceSummary> = {}) =>
	serviceRow(name, { formId: LASER, formName: "Laser", ...over });

/** Serves the backend and the [Novo] menu's templates, then mounts /services. */
async function open(
	b: Backend,
	wait: string | null = b.services.find((s) => s.status === "active")?.name ??
		null,
) {
	serveBackend(b);
	serveServiceTemplates(
		b.templates.map((t) =>
			serviceTemplateSummary(t.name, { id: t.id, status: t.status }),
		),
	);
	const view = renderServices(<ServicesList />);
	if (wait) await screen.findByText(wait);
	return view;
}

// ------------------------------------------------------------------ helpers

const chips = () =>
	screen
		.queryAllByRole("button")
		.filter((el) => el.hasAttribute("aria-pressed"));
const chipNames = () => chips().map((el) => el.textContent?.trim());
const activeChips = () =>
	chips()
		.filter((el) => el.getAttribute("aria-pressed") === "true")
		.map((el) => el.textContent?.trim());
const chip = (name: string): HTMLElement => {
	const found = chips().find((el) => el.textContent?.trim() === name);
	if (!found) throw new Error(`no chip ${name}`);
	return found;
};
const tapChip = (name: string) => fireEvent.click(chip(name));

const sectionHeaders = () =>
	screen
		.queryAllByRole("heading")
		.filter((h) => h.textContent?.trim() !== TITLE)
		.map((h) => h.textContent?.trim());

/** Section headers and row names in document order. */
function sequence(names: string[]): string[] {
	const out: string[] = [];
	for (const el of document.querySelectorAll(
		'h1, h2, h3, h4, h5, h6, [role="heading"], li',
	)) {
		if (el.tagName === "LI") {
			const name = names.find((n) => within(el as HTMLElement).queryByText(n));
			if (name) out.push(name);
		} else {
			const text = (el.textContent ?? "").trim();
			if (text !== TITLE) out.push(text);
		}
	}
	return out;
}

const listedNames = (names: string[]) =>
	names.filter((n) => screen.queryByText(n) !== null);

const listCalls = () => callsTo("GET", "/api/services");
const lastList = () => {
	const last = listCalls().at(-1);
	if (!last) throw new Error("no list request");
	return last.query;
};
const post = (id: string, action: string) =>
	callsTo("POST", `${servicePath(id)}/${action}`);
const idOf = (b: Backend, name: string) => {
	const row = b.services.find((s) => s.name === name);
	if (!row) throw new Error(`no service ${name}`);
	return row.id;
};

/** Opens the row as a swipe past half of its actions does. */
const swipeOpen = (name: string) =>
	dragEnd(draggableOf(rowOf(name)), { offset: -1000, velocity: 0 });
const rowAction = (name: string, action: string) =>
	within(rowOf(name)).findByRole("button", { name: action });
const rowActionNow = (name: string, action: string) =>
	within(rowOf(name)).queryByRole("button", { name: action });
const toastButton = (name: string) => screen.findByRole("button", { name });

async function archiveFromRow(name: string) {
	swipeOpen(name);
	press(await rowAction(name, "Arquivar"));
}

/** The dialog's own buttons and typed-name input. */
async function deleteDialog() {
	const dialog = await screen.findByRole("dialog");
	return {
		dialog,
		typed: within(dialog).getByLabelText(ts("delete.confirmLabel")),
		confirm: () => within(dialog).getByRole("button", { name: "Excluir" }),
	};
}

/** The floating "+" as a link or a button, whichever the page renders. */
const fab = () =>
	screen
		.findByRole("link", { name: ts("new.floating") })
		.catch(() => screen.findByRole("button", { name: ts("new.floating") }));

const placeholdersNear = (todos: HTMLElement) => {
	let node: HTMLElement | null = todos.parentElement;
	for (let depth = 0; node && depth < 3; depth += 1) {
		const found = Array.from(
			node.querySelectorAll('[aria-hidden="true"]'),
		).filter((el) => el.tagName.toLowerCase() !== "svg" && !el.closest("svg"));
		if (found.length > 0) return found;
		node = node.parentElement;
	}
	return [];
};

// --------------------------------------------------------- title and chips

describe("Title and chips", () => {
	it("AC-0005-85 titles the page 'Procedimentos/Consultas'", async () => {
		await open(backend([inEsteticos("Facial")], [ESTETICOS_T]));

		const title = screen.getByRole("heading", { level: 1 });

		expect(title.textContent).toBe(TITLE);
		expect(ts("list.title")).toBe(TITLE);
	});

	it("AC-0005-86 reads the chips 'Todos', 'Dermatologia', 'Estéticos', 'Arquivados' in that order, with 'Todos' active", async () => {
		// "Laser" has no active service; one archived service exists
		await open(
			backend(
				[
					inEsteticos("Facial"),
					inEsteticos("Botox"),
					inDermatologia("Peeling"),
					inLaser("Laser antigo", { status: "inactive" }),
				],
				[ESTETICOS_T, DERMATOLOGIA_T, LASER_T],
			),
		);

		await waitFor(() =>
			expect(chipNames()).toEqual([
				"Todos",
				"Dermatologia",
				"Estéticos",
				"Arquivados",
			]),
		);
		expect(activeChips()).toEqual(["Todos"]);
	});

	it("AC-0005-86 shows no 'Arquivados' chip when the tenant has no archived service", async () => {
		await open(backend([inEsteticos("Facial")], [ESTETICOS_T]));

		await waitFor(() => expect(chipNames()).toEqual(["Todos", "Estéticos"]));
	});

	it("AC-0005-86 lists the chip of an archived template that still has an active service", async () => {
		await open(
			backend(
				[inLaser("Laser facial")],
				[template(LASER, "Laser", "archived")],
			),
		);

		await waitFor(() => expect(chipNames()).toEqual(["Todos", "Laser"]));
	});

	it("AC-0005-87 lists the active services in sections by template name, services by name within them", async () => {
		const b = backend(
			[inDermatologia("Peeling"), inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T, DERMATOLOGIA_T],
		);
		await open(b);
		await screen.findByText("Botox");

		expect(sequence(["Peeling", "Facial", "Botox"])).toEqual([
			"Dermatologia",
			"Peeling",
			"Estéticos",
			"Botox",
			"Facial",
		]);
		const query = lastList();
		expect(query.get("sort")).toBe("form");
		expect(query.get("formId")).toBeNull();
		expect(query.get("status") ?? "active").toBe("active");
	});

	it("AC-0005-88 lists only the template's services, with no section header, under its chip, which alone is active", async () => {
		await open(
			backend(
				[inDermatologia("Peeling"), inEsteticos("Facial")],
				[ESTETICOS_T, DERMATOLOGIA_T],
			),
		);
		await screen.findByText("Peeling");

		tapChip("Estéticos");

		await waitFor(() => expect(screen.queryByText("Peeling")).toBeNull());
		expect(await screen.findByText("Facial")).toBeTruthy();
		expect(sectionHeaders()).toEqual([]);
		expect(activeChips()).toEqual(["Estéticos"]);
		const query = lastList();
		expect(query.get("formId")).toBe(ESTETICOS);
		expect(query.get("sort")).toBe("name");
		expect(query.get("status") ?? "active").toBe("active");
	});

	it("AC-0005-89 lists only the archived services, with no section header, under 'Arquivados'", async () => {
		await open(
			backend(
				[
					inEsteticos("Facial"),
					inLaser("Laser antigo", { status: "inactive" }),
				],
				[ESTETICOS_T, LASER_T],
			),
		);
		await screen.findByText("Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));

		tapChip("Arquivados");

		await screen.findByText("Laser antigo");
		expect(screen.queryByText("Facial")).toBeNull();
		expect(sectionHeaders()).toEqual([]);
		expect(activeChips()).toEqual(["Arquivados"]);
		expect(lastList().get("status")).toBe("inactive");
		// the archived row's dot is the muted one
		expect(
			rowOf("Laser antigo").querySelector('[data-status="inactive"]'),
		).not.toBeNull();
	});

	it("AC-0005-90 shows the active status dot, the name, '1h 30min' and 'R$ 150,00' on a row", async () => {
		await open(
			backend(
				[
					inEsteticos("Sessão individual", {
						durationMinutes: 90,
						priceCents: 15000,
					}),
				],
				[ESTETICOS_T],
			),
		);

		const row = rowOf("Sessão individual");

		expect(row.querySelector('[data-status="active"]')).not.toBeNull();
		expect(leafTexts(row)).toContain("Sessão individual");
		const text = plain(row.textContent);
		expect(text).toContain("1h 30min");
		expect(text).toContain("R$ 150,00");
	});

	it("R14 shows no status filter, template picker, sort control or total on a narrow screen", async () => {
		await open(
			backend(
				[inEsteticos("Facial"), inDermatologia("Peeling")],
				[ESTETICOS_T, DERMATOLOGIA_T],
			),
		);
		await screen.findByText("Peeling");

		expect(screen.queryAllByRole("radio")).toHaveLength(0);
		expect(
			screen.queryByRole("button", {
				name: (n: string) => n.startsWith("Modelo:"),
			}),
		).toBeNull();
		expect(
			screen.queryByRole("button", {
				name: (n: string) => n.startsWith("Ordenar por:"),
			}),
		).toBeNull();
		expect(screen.queryByText(/^\d+ serviços?$/)).toBeNull();
	});
});

// ------------------------------------------------------------- chips states

describe("Chips while they load or fail", () => {
	it("AC-0005-117 shows 'Todos' followed by placeholder chips, announces the loading, and lists services meanwhile", async () => {
		const b = backend([inEsteticos("Facial")], [ESTETICOS_T]);
		b.summary = "never";

		await open(b);

		expect(chipNames()).toEqual(["Todos"]);
		expect(activeChips()).toEqual(["Todos"]);
		expect(screen.getByText(ts("list.chips.loading"))).toBeTruthy();
		expect(placeholdersNear(chip("Todos")).length).toBeGreaterThan(0);
		expect(screen.getByText("Facial")).toBeTruthy();
	});

	it("AC-0005-118 shows 'Todos' and 'Tentar novamente' when the summary fails, and the list keeps working under 'Todos'", async () => {
		const b = backend([inEsteticos("Facial")], [ESTETICOS_T]);
		b.summary = 500;

		await open(b);

		const retry = await screen.findByRole("button", {
			name: ts("list.chips.retry"),
		});
		expect(ts("list.chips.retry")).toBe("Tentar novamente");
		expect(chipNames()).toEqual(["Todos"]);
		expect(retry.hasAttribute("aria-pressed")).toBe(false);
		expect(
			chip("Todos").compareDocumentPosition(retry) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(screen.getByText("Facial")).toBeTruthy();
	});

	it("AC-0005-119 loads the chips again on 'Tentar novamente': 'Estéticos' appears after 'Todos'", async () => {
		const b = backend([inEsteticos("Facial")], [ESTETICOS_T]);
		b.summary = 500;
		await open(b);
		const retry = await screen.findByRole("button", {
			name: ts("list.chips.retry"),
		});
		b.summary = "ok";

		fireEvent.click(retry);

		await waitFor(() => expect(chipNames()).toEqual(["Todos", "Estéticos"]));
		expect(
			screen.queryByRole("button", { name: ts("list.chips.retry") }),
		).toBeNull();
	});
});

// -------------------------------------------------------------- row actions

describe("Swipe actions", () => {
	it("AC-0005-96 archives at once from the swiped row: no dialog, the row leaves, the toast offers 'Desfazer'", async () => {
		const b = backend(
			[inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T],
		);
		await open(b, "Facial");
		const id = idOf(b, "Facial");

		await archiveFromRow("Facial");

		await waitFor(() => expect(screen.queryByText("Facial")).toBeNull());
		expect(post(id, "inactivate")).toHaveLength(1);
		expect(screen.queryByRole("dialog")).toBeNull();
		await screen.findByText(ts("toast.archived"));
		expect(ts("toast.archived")).toBe("Serviço arquivado");
		expect(await toastButton("Desfazer")).toBeTruthy();
		expect(screen.getByText("Botox")).toBeTruthy();
	});

	it("AC-0005-97 reactivates the service and lists it again when 'Desfazer' is tapped", async () => {
		const b = backend(
			[inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T],
		);
		await open(b, "Facial");
		const id = idOf(b, "Facial");
		await archiveFromRow("Facial");
		await waitFor(() => expect(screen.queryByText("Facial")).toBeNull());

		press(await toastButton("Desfazer"));

		await screen.findByText("Facial");
		expect(post(id, "reactivate")).toHaveLength(1);
		expect(b.services.find((s) => s.id === id)?.status).toBe("active");
	});

	it("AC-0005-98 opens the delete dialog asking to type 'Facial' when 'Excluir' is tapped on a service without history", async () => {
		const b = backend([inEsteticos("Facial")], [ESTETICOS_T]);
		await open(b, "Facial");
		swipeOpen("Facial");

		press(await rowAction("Facial", "Excluir"));

		const { dialog, confirm } = await deleteDialog();
		expect(
			within(dialog).getByText(ts("delete.confirm", { name: "Facial" })),
		).toBeTruthy();
		expect((confirm() as HTMLButtonElement).disabled).toBe(true);
		expect(post(idOf(b, "Facial"), "delete")).toHaveLength(0);
	});

	it("§4.4 step 4 deletes with the typed name, removes the row and shows 'Serviço excluído'", async () => {
		const b = backend(
			[inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T],
		);
		await open(b, "Facial");
		const id = idOf(b, "Facial");
		swipeOpen("Facial");
		press(await rowAction("Facial", "Excluir"));
		const { typed, confirm } = await deleteDialog();
		fireEvent.change(typed, { target: { value: "Facial" } });

		press(confirm());

		await screen.findByText(ts("toast.deleted"));
		await waitFor(() => expect(screen.queryByText("Facial")).toBeNull());
		expect(post(id, "delete")).toHaveLength(1);
		expect(post(id, "delete")[0]?.body).toEqual({ confirmName: "Facial" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByText("Botox")).toBeTruthy();
	});

	it("AC-0005-99 (partly) opens no dialog and sends no request for 'Excluir' on a service with history: the row snaps closed and the toast offers 'Arquivar'", async () => {
		const b = backend(
			[inEsteticos("Facial"), inDermatologia("Peeling", { hasHistory: true })],
			[ESTETICOS_T, DERMATOLOGIA_T],
		);
		await open(b, "Peeling");
		swipeOpen("Peeling");
		const delete_ = await rowAction("Peeling", "Excluir");
		const before = calls.length;

		press(delete_);

		await screen.findByText(ts("delete.hasHistory"));
		expect(ts("delete.hasHistory")).toBe(
			"Serviços já utilizados não podem ser excluídos.",
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(calls.length).toBe(before);
		expect(rowActionNow("Peeling", "Excluir")).toBeNull();
		expect(await toastButton("Arquivar")).toBeTruthy();
	});

	it("AC-0005-100 (partly) archives the service and removes its row when the toast's 'Arquivar' is tapped", async () => {
		const b = backend(
			[inEsteticos("Facial"), inDermatologia("Peeling", { hasHistory: true })],
			[ESTETICOS_T, DERMATOLOGIA_T],
		);
		await open(b, "Peeling");
		swipeOpen("Peeling");
		press(await rowAction("Peeling", "Excluir"));

		press(await toastButton("Arquivar"));

		await waitFor(() => expect(screen.queryByText("Peeling")).toBeNull());
		expect(post(idOf(b, "Peeling"), "inactivate")).toHaveLength(1);
		expect(post(idOf(b, "Peeling"), "delete")).toHaveLength(0);
		expect(screen.getByText("Facial")).toBeTruthy();
	});

	it("AC-0005-101 (partly) closes the dialog and the row, and offers 'Arquivar' in the toast, after a 409 service.has-history", async () => {
		const b = backend(
			[inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T],
		);
		await open(b, "Facial");
		const id = idOf(b, "Facial");
		swipeOpen("Facial");
		press(await rowAction("Facial", "Excluir"));
		const { typed, confirm } = await deleteDialog();
		// an appointment is linked to "Facial" meanwhile
		b.historyOnDelete.add(id);
		fireEvent.change(typed, { target: { value: "Facial" } });

		press(confirm());

		await screen.findByText(ts("delete.hasHistory"));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(post(id, "delete")).toHaveLength(1);
		expect(rowActionNow("Facial", "Excluir")).toBeNull();
		expect(await toastButton("Arquivar")).toBeTruthy();
		expect(screen.getByText("Facial")).toBeTruthy();
	});

	it("AC-0005-102 reveals 'Reativar' and 'Excluir', and no 'Arquivar', on a swiped archived row", async () => {
		const b = backend(
			[inEsteticos("Facial"), inLaser("Laser antigo", { status: "inactive" })],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));
		tapChip("Arquivados");
		await screen.findByText("Laser antigo");

		swipeOpen("Laser antigo");

		expect(await rowAction("Laser antigo", "Reativar")).toBeTruthy();
		expect(await rowAction("Laser antigo", "Excluir")).toBeTruthy();
		expect(rowActionNow("Laser antigo", "Arquivar")).toBeNull();
	});

	it("AC-0005-102 reactivates from the swiped archived row: the row leaves 'Arquivados'", async () => {
		const b = backend(
			[inEsteticos("Facial"), inLaser("Laser antigo", { status: "inactive" })],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));
		tapChip("Arquivados");
		await screen.findByText("Laser antigo");
		swipeOpen("Laser antigo");

		press(await rowAction("Laser antigo", "Reativar"));

		await waitFor(() => expect(screen.queryByText("Laser antigo")).toBeNull());
		expect(post(idOf(b, "Laser antigo"), "reactivate")).toHaveLength(1);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0005-114 (partly) opens no dialog and sends no request for 'Excluir' on an archived service with history: the row snaps closed and the toast has no action", async () => {
		const b = backend(
			[
				inEsteticos("Facial"),
				inLaser("Laser antigo", { status: "inactive", hasHistory: true }),
			],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));
		tapChip("Arquivados");
		await screen.findByText("Laser antigo");
		swipeOpen("Laser antigo");
		const delete_ = await rowAction("Laser antigo", "Excluir");
		const before = calls.length;

		press(delete_);

		const message = await screen.findByText(ts("delete.hasHistory"));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(calls.length).toBe(before);
		expect(rowActionNow("Laser antigo", "Excluir")).toBeNull();
		// the toast carries no action of its own: only the close button
		const toast = message.closest("li") as HTMLElement;
		expect(
			within(toast)
				.queryAllByRole("button")
				.map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim()),
		).not.toContain("Arquivar");
		expect(screen.queryByRole("button", { name: "Arquivar" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Reativar" })).toBeNull();
	});

	it("AC-0005-113 drops the chip of a template whose last service was archived, and 'Todos' becomes active", async () => {
		const b = backend(
			[inEsteticos("Facial"), inLaser("Laser facial")],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Laser"));
		tapChip("Laser");
		await waitFor(() => expect(activeChips()).toEqual(["Laser"]));
		await screen.findByText("Laser facial");

		await archiveFromRow("Laser facial");

		await waitFor(() => expect(chipNames()).not.toContain("Laser"));
		expect(activeChips()).toEqual(["Todos"]);
		await screen.findByText("Facial");
		expect(screen.queryByText("Laser facial")).toBeNull();
	});
});

// --------------------------------------------------------------- the ⋯ menu

describe("Actions menu", () => {
	it("AC-0005-103 opens a menu offering 'Arquivar' and 'Excluir' from the ⋯ button of an active row", async () => {
		await open(backend([inEsteticos("Facial")], [ESTETICOS_T]));

		press(
			within(rowOf("Facial")).getByRole("button", { name: ts("actions.menu") }),
		);

		const menu = await screen.findByRole("menu");
		expect(ts("actions.menu")).toBe("Mais ações");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual(["Arquivar", "Excluir"]);
	});

	it("AC-0005-103 offers 'Reativar' and 'Excluir' on an archived row", async () => {
		const b = backend(
			[inEsteticos("Facial"), inLaser("Laser antigo", { status: "inactive" })],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));
		tapChip("Arquivados");
		await screen.findByText("Laser antigo");

		press(
			within(rowOf("Laser antigo")).getByRole("button", {
				name: ts("actions.menu"),
			}),
		);

		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual(["Reativar", "Excluir"]);
	});

	it("AC-0005-103 archives the service when 'Arquivar' is chosen in the menu", async () => {
		const b = backend(
			[inEsteticos("Facial"), inEsteticos("Botox")],
			[ESTETICOS_T],
		);
		await open(b, "Facial");
		press(
			within(rowOf("Facial")).getByRole("button", { name: ts("actions.menu") }),
		);

		fireEvent.click(await screen.findByRole("menuitem", { name: "Arquivar" }));

		await waitFor(() => expect(screen.queryByText("Facial")).toBeNull());
		expect(post(idOf(b, "Facial"), "inactivate")).toHaveLength(1);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0005-103 opens the delete dialog when 'Excluir' is chosen in the menu", async () => {
		await open(backend([inEsteticos("Facial")], [ESTETICOS_T]));
		press(
			within(rowOf("Facial")).getByRole("button", { name: ts("actions.menu") }),
		);

		fireEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }));

		const { dialog, confirm } = await deleteDialog();
		expect(
			within(dialog).getByText(ts("delete.confirm", { name: "Facial" })),
		).toBeTruthy();
		expect((confirm() as HTMLButtonElement).disabled).toBe(true);
	});

	it("AC-0005-104 opens the same menu after a long press of the row", async () => {
		await open(backend([inEsteticos("Facial")], [ESTETICOS_T]));
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

		fireEvent.pointerDown(draggableOf(rowOf("Facial")), {
			pointerId: 1,
			pointerType: "touch",
			clientX: 40,
			clientY: 20,
		});
		act(() => {
			vi.advanceTimersByTime(500);
			vi.runOnlyPendingTimers();
		});
		vi.useRealTimers();

		const menu = await screen.findByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((el) => el.textContent?.trim()),
		).toEqual(["Arquivar", "Excluir"]);
	});
});

// ---------------------------------------------------------------- floating +

describe("Floating +", () => {
	it("AC-0005-105 opens the fill-in page of the active chip's template", async () => {
		await open(
			backend(
				[inEsteticos("Facial"), inDermatologia("Peeling")],
				[ESTETICOS_T, DERMATOLOGIA_T],
			),
		);
		await waitFor(() => expect(chipNames()).toContain("Estéticos"));
		tapChip("Estéticos");
		await waitFor(() => expect(activeChips()).toEqual(["Estéticos"]));

		const plus = await fab();
		let target = plus.closest("a")?.getAttribute("href") ?? null;
		if (target === null) {
			press(plus);
			await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
			target = navigatedTo().at(-1) ?? "";
		}

		expect(target).toContain(`/services/new?form=${ESTETICOS}`);
		expect(ts("new.floating")).toBe("Novo serviço");
	});

	it("AC-0005-106 opens the Novo menu with 'Criar novo modelo' and the active service templates under 'Todos'", async () => {
		await open(
			backend(
				[inEsteticos("Facial"), inDermatologia("Peeling")],
				[ESTETICOS_T, DERMATOLOGIA_T],
			),
		);
		await screen.findByText("Peeling");

		press(await screen.findByRole("button", { name: ts("new.floating") }));

		const menu = await screen.findByRole("menu");
		await within(menu).findByRole("menuitem", { name: "Estéticos" });
		expect(menuEntries(menu)).toEqual([
			ts("new.createTemplate"),
			"---",
			"Estéticos",
			"Dermatologia",
		]);
	});

	it("AC-0005-106 opens the same Novo menu under 'Arquivados'", async () => {
		const b = backend(
			[inEsteticos("Facial"), inLaser("Laser antigo", { status: "inactive" })],
			[ESTETICOS_T, LASER_T],
		);
		await open(b, "Facial");
		await waitFor(() => expect(chipNames()).toContain("Arquivados"));
		tapChip("Arquivados");
		await screen.findByText("Laser antigo");

		press(await screen.findByRole("button", { name: ts("new.floating") }));

		const menu = await screen.findByRole("menu");
		await within(menu).findByRole("menuitem", { name: "Estéticos" });
		expect(menuEntries(menu)[0]).toBe(ts("new.createTemplate"));
	});

	it("AC-0005-115 opens the Novo menu, not a fill-in page, under the chip of an archived template", async () => {
		await open(
			backend(
				[inEsteticos("Facial"), inLaser("Laser facial")],
				[ESTETICOS_T, template(LASER, "Laser", "archived")],
			),
		);
		await waitFor(() => expect(chipNames()).toContain("Laser"));
		tapChip("Laser");
		await waitFor(() => expect(activeChips()).toEqual(["Laser"]));
		await screen.findByText("Laser facial");

		press(await screen.findByRole("button", { name: ts("new.floating") }));

		const menu = await screen.findByRole("menu");
		await within(menu).findByRole("menuitem", { name: "Estéticos" });
		// only the active service templates: the archived "Laser" is not offered
		expect(menuEntries(menu)).toEqual([
			ts("new.createTemplate"),
			"---",
			"Estéticos",
		]);
		expect(navigatedTo()).toHaveLength(0);
		expect(screen.queryByRole("link", { name: ts("new.floating") })).toBeNull();
	});
});

// ------------------------------------------------------------------- search

describe("Search", () => {
	it("AC-0005-107 searches within the active chip: 'fac' sends q with the chip's formId and lists only 'Facial'", async () => {
		await open(
			backend(
				[
					inEsteticos("Facial"),
					inEsteticos("Botox"),
					inDermatologia("Peeling"),
				],
				[ESTETICOS_T, DERMATOLOGIA_T],
			),
		);
		await waitFor(() => expect(chipNames()).toContain("Estéticos"));
		tapChip("Estéticos");
		await screen.findByText("Botox");
		expect(listedNames(["Peeling"])).toEqual([]);

		press(screen.getByRole("button", { name: ts("list.searchOpen") }));
		fireEvent.change(await screen.findByLabelText(ts("list.search")), {
			target: { value: "fac" },
		});

		await waitFor(() => expect(screen.queryByText("Botox")).toBeNull());
		expect(await screen.findByText("Facial")).toBeTruthy();
		expect(screen.queryByText("Peeling")).toBeNull();
		const query = lastList();
		expect(query.get("q")).toBe("fac");
		expect(query.get("formId")).toBe(ESTETICOS);
		expect(activeChips()).toEqual(["Estéticos"]);
		expect(ts("list.searchOpen")).toBe("Buscar");
	});
});
