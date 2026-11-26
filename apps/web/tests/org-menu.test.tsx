// SPEC-0008 AC-0008-06 to -18, -43, -47 to -50, -52 to -54: the organization
// menu behind "Trocar organização" (network faked by shell-harness).
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	anaTenants,
	BIA_ID,
	before,
	CLIENTS_PATH,
	callsTo,
	clinicaBia,
	espacoCaio,
	expireSession,
	findHeader,
	LIST,
	NARROW,
	navigatedTo,
	networkDown,
	never,
	on,
	orgLink,
	orgTrigger,
	press,
	pressEscape,
	renderShell,
	resetApi,
	resetShell,
	routeState,
	SELECT,
	serveShell,
	stubFetch,
	studioAna,
	unexpected,
	wentToSignInFor,
} from "./shell-harness";

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

const UNEXPECTED_TEXT =
	"Não foi possível concluir agora. Tente novamente em instantes.";
const NETWORK_TEXT =
	"Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.";
const INACTIVE_TEXT =
	"Esta organização está suspensa e não pode ser aberta no momento.";
const NOT_FOUND_TEXT =
	"Esta organização não está mais disponível para sua conta. Atualize a lista e escolha outra.";

beforeEach(() => {
	resetApi();
	stubFetch();
	serveShell();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	resetShell();
});

// ------------------------------------------------------------------ helpers

async function mount(options: Parameters<typeof renderShell>[0] = {}) {
	const view = renderShell(options);
	await findHeader();
	return view;
}

const findMenu = () =>
	screen.findByRole("menu", { name: "Trocar organização" });

async function openMenu() {
	press(orgTrigger());
	return findMenu();
}

/** Opens the menu and waits for the organizations to be listed. */
async function openList() {
	const menu = await openMenu();
	await within(menu).findAllByRole("menuitemradio");
	return menu;
}

const orgItems = (menu: HTMLElement) =>
	within(menu).getAllByRole("menuitemradio");

function orgItem(menu: HTMLElement, name: string): HTMLElement {
	const item = orgItems(menu).find((el) => el.textContent?.includes(name));
	if (!item) throw new Error(`no organization item for ${name}`);
	return item;
}

const isDisabledItem = (el: HTMLElement) =>
	el.getAttribute("aria-disabled") === "true";

const selections = () => callsTo(...SELECT);

const settle = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

const menuClosed = () =>
	waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

/** Focus on the trigger once the menu has closed onto it. */
const focusOnTrigger = () =>
	waitFor(() => expect(document.activeElement).toBe(orgTrigger()));

// ------------------------------------------------------------------- the menu

describe("organization menu", () => {
	it('AC-0008-06 Trocar organização opens a menu holding a group named "Organizações" with the three organizations in order, then Criar organização; Studio Ana checked; trigger expanded', async () => {
		await mount();

		const menu = await openList();

		const group = within(menu).getByRole("group", { name: "Organizações" });
		const items = orgItems(menu);
		expect(items.map((el) => el.textContent)).toEqual([
			expect.stringContaining("Studio Ana"),
			expect.stringContaining("Clínica Bia"),
			expect.stringContaining("Espaço Caio"),
		]);
		for (const item of items) expect(group.contains(item)).toBe(true);
		expect(items.map((el) => el.getAttribute("aria-checked"))).toEqual([
			"true",
			"false",
			"false",
		]);
		const create = within(menu).getByRole("menuitem", {
			name: "Criar organização",
		});
		expect(before(items[2] as HTMLElement, create)).toBe(true);
		expect(orgTrigger().getAttribute("aria-expanded")).toBe("true");
	});

	it('AC-0008-07 while the list is pending the menu shows "Carregando suas organizações..."', async () => {
		on(...LIST, never);
		await mount();

		const menu = await openMenu();

		expect(
			await within(menu).findByText("Carregando suas organizações..."),
		).toBeTruthy();
	});

	it("AC-0008-08 an unexpected list failure shows its message and Tentar novamente", async () => {
		on(...LIST, unexpected);
		await mount();

		const menu = await openMenu();

		expect(await within(menu).findByText(UNEXPECTED_TEXT)).toBeTruthy();
		expect(
			within(menu).getByRole("menuitem", { name: "Tentar novamente" }),
		).toBeTruthy();
	});

	it("AC-0008-09 Tentar novamente requests the list again and shows it", async () => {
		on(...LIST, unexpected);
		await mount();
		const menu = await openMenu();
		const retry = await within(menu).findByRole("menuitem", {
			name: "Tentar novamente",
		});

		on(...LIST, { status: 200, body: { tenants: anaTenants() } });
		press(retry);

		await within(menu).findAllByRole("menuitemradio");
		expect(orgItems(menu).map((el) => el.textContent)).toEqual([
			expect.stringContaining("Studio Ana"),
			expect.stringContaining("Clínica Bia"),
			expect.stringContaining("Espaço Caio"),
		]);
		expect(callsTo(...LIST)).toHaveLength(2);
	});

	it('AC-0008-10 Espaço Caio shows "Suspensa", is disabled, and choosing it sends no selection', async () => {
		await mount();
		const menu = await openList();
		const sent = selections().length;

		const caio = orgItem(menu, "Espaço Caio");
		expect(within(caio).getByText("Suspensa")).toBeTruthy();
		expect(isDisabledItem(caio)).toBe(true);

		press(caio);
		await settle();

		expect(selections()).toHaveLength(sent);
		expect(navigatedTo()).toEqual([]);
		expect(routeState.pathname).toBe(CLIENTS_PATH);
	});

	it("AC-0008-11 choosing Clínica Bia selects it and navigates to its client list", async () => {
		await mount();
		const menu = await openList();

		press(orgItem(menu, "Clínica Bia"));

		await waitFor(() =>
			expect(navigatedTo()).toContain(`/orgs/${BIA_ID}/clients`),
		);
		expect(
			selections().some(
				(call) => (call.body as { tenantId?: string }).tenantId === BIA_ID,
			),
		).toBe(true);
		const link = await screen.findByRole("link", {
			name: "Clínica Bia, ver todas as organizações",
		});
		expect(within(link).getByText("C")).toBeTruthy();
		expect(within(link).getByText("Clínica Bia")).toBeTruthy();
	});

	it("AC-0008-12 choosing the open organization closes the menu and sends no selection", async () => {
		await mount();
		const menu = await openList();
		const sent = selections().length;

		press(orgItem(menu, "Studio Ana"));

		await menuClosed();
		await settle();
		expect(selections()).toHaveLength(sent);
		expect(navigatedTo()).toEqual([]);
		expect(routeState.pathname).toBe(CLIENTS_PATH);
	});

	it("AC-0008-13 while a selection is pending the trigger is aria-disabled and aria-busy, activating it opens nothing, and no second selection is sent", async () => {
		await mount();
		const menu = await openList();
		const sent = selections().length;
		on(...SELECT, never);

		press(orgItem(menu, "Clínica Bia"));

		await waitFor(() =>
			expect(orgTrigger().getAttribute("aria-busy")).toBe("true"),
		);
		expect(orgTrigger().getAttribute("aria-disabled")).toBe("true");
		const listed = callsTo(...LIST).length;

		press(orgTrigger());
		await settle();

		expect(screen.queryByRole("menu")).toBeNull();
		expect(callsTo(...LIST)).toHaveLength(listed);
		expect(selections()).toHaveLength(sent + 1);
	});

	it("AC-0008-14 tenant.inactive shows its toast, stays on Studio Ana, re-enables the trigger and keeps focus on it", async () => {
		await mount();
		const menu = await openList();
		on(...SELECT, { status: 403, body: { error: "tenant.inactive" } });

		press(orgItem(menu, "Clínica Bia"));

		expect(await screen.findByText(INACTIVE_TEXT)).toBeTruthy();
		expect(navigatedTo()).toEqual([]);
		expect(routeState.pathname).toBe(CLIENTS_PATH);
		expect(orgLink("Studio Ana")).toBeTruthy();
		await waitFor(() => {
			expect(orgTrigger().getAttribute("aria-disabled")).not.toBe("true");
			expect(orgTrigger().getAttribute("aria-busy")).not.toBe("true");
		});
		expect((orgTrigger() as HTMLButtonElement).disabled).toBe(false);
		await focusOnTrigger();
	});

	it("AC-0008-15 an unreachable server on selection shows the network toast and stays", async () => {
		await mount();
		const menu = await openList();
		on(...SELECT, networkDown);

		press(orgItem(menu, "Clínica Bia"));

		expect(await screen.findByText(NETWORK_TEXT)).toBeTruthy();
		expect(navigatedTo()).toEqual([]);
		expect(routeState.pathname).toBe(CLIENTS_PATH);
		expect(orgLink("Studio Ana")).toBeTruthy();
	});

	it("AC-0008-16 an expired session on selection goes to sign-in with the current page as next", async () => {
		await mount();
		const menu = await openList();
		expireSession(...SELECT);

		press(orgItem(menu, "Clínica Bia"));

		await waitFor(() => expect(wentToSignInFor(CLIENTS_PATH)).toBe(true));
		expect(navigatedTo().some((target) => target.includes(BIA_ID))).toBe(false);
	});

	it("AC-0008-17 Criar organização goes to /create-tenant", async () => {
		await mount();
		const menu = await openList();

		const create = within(menu).getByRole("menuitem", {
			name: "Criar organização",
		});

		expect(create.getAttribute("href")).toBe("/create-tenant");
	});

	it("AC-0008-18 the menu lists exactly the organizations the server returns", async () => {
		// the server answers only ana@example.com's organizations; Ateliê Duda
		// belongs to bia@example.com and is not among them
		await mount();

		const menu = await openList();

		expect(orgItems(menu)).toHaveLength(3);
		expect(within(menu).queryByText(/Ateliê Duda/)).toBeNull();
		expect(screen.queryByText(/Ateliê Duda/)).toBeNull();
	});

	it("AC-0008-43 Down moves focus from Studio Ana to Clínica Bia", async () => {
		await mount();
		const menu = await openList();
		const studio = orgItem(menu, "Studio Ana");
		const bia = orgItem(menu, "Clínica Bia");

		studio.focus();
		expect(document.activeElement).toBe(studio);
		fireEvent.keyDown(studio, { key: "ArrowDown", code: "ArrowDown" });

		await waitFor(() => expect(document.activeElement).toBe(bia));
	});

	it("AC-0008-47 tenant.not-found shows its toast and stays on Studio Ana", async () => {
		await mount();
		const menu = await openList();
		on(...SELECT, { status: 404, body: { error: "tenant.not-found" } });

		press(orgItem(menu, "Clínica Bia"));

		expect(await screen.findByText(NOT_FOUND_TEXT)).toBeTruthy();
		expect(navigatedTo()).toEqual([]);
		expect(routeState.pathname).toBe(CLIENTS_PATH);
		expect(orgLink("Studio Ana")).toBeTruthy();
	});

	it("AC-0008-48 an expired session on the list goes to sign-in with the current page as next", async () => {
		await mount();
		expireSession(...LIST);

		press(orgTrigger());

		await waitFor(() => expect(wentToSignInFor(CLIENTS_PATH)).toBe(true));
	});

	it("AC-0008-49 Escape closes the organization menu and focuses Trocar organização", async () => {
		await mount();
		const menu = await openList();

		pressEscape(document.activeElement ?? menu);

		await menuClosed();
		await focusOnTrigger();
	});

	it("AC-0008-50 a single organization lists only Studio Ana, checked, then Criar organização", async () => {
		serveShell({ tenants: [studioAna] });
		await mount();

		const menu = await openList();

		const items = orgItems(menu);
		expect(items).toHaveLength(1);
		expect(items[0]?.textContent).toContain("Studio Ana");
		expect(items[0]?.getAttribute("aria-checked")).toBe("true");
		const create = within(menu).getByRole("menuitem", {
			name: "Criar organização",
		});
		expect(before(items[0] as HTMLElement, create)).toBe(true);
	});

	it("AC-0008-52 Down from Clínica Bia reaches Espaço Caio, which is aria-disabled", async () => {
		await mount();
		const menu = await openList();
		const bia = orgItem(menu, "Clínica Bia");
		const caio = orgItem(menu, "Espaço Caio");

		bia.focus();
		fireEvent.keyDown(bia, { key: "ArrowDown", code: "ArrowDown" });

		await waitFor(() => expect(document.activeElement).toBe(caio));
		expect(isDisabledItem(caio)).toBe(true);
	});

	it("AC-0008-53 narrow: the organization menu is a menu, not a dialog", async () => {
		await mount({ width: NARROW });

		const menu = await openList();

		expect(menu.getAttribute("role")).toBe("menu");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0008-54 reopening the menu requests the list again and shows a reactivated organization enabled", async () => {
		await mount();
		const first = await openList();
		expect(isDisabledItem(orgItem(first, "Espaço Caio"))).toBe(true);
		pressEscape(document.activeElement ?? first);
		await menuClosed();

		on(...LIST, {
			status: 200,
			body: {
				tenants: [studioAna, clinicaBia, { ...espacoCaio, status: "active" }],
			},
		});
		const second = await openMenu();

		await waitFor(() =>
			expect(isDisabledItem(orgItem(second, "Espaço Caio"))).toBe(false),
		);
		expect(callsTo(...LIST)).toHaveLength(2);
	});
});
