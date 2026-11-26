// SPEC-0008 AC-0008-32 to -40: the navigation sheet on narrow screens and the
// sidebar on wide ones (network faked by shell-harness).
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ANA_ID,
	findHeader,
	headerOf,
	NARROW,
	press,
	pressEscape,
	renderShell,
	resetApi,
	resetShell,
	serveShell,
	setViewport,
	stubFetch,
	TABLET,
	WIDE,
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

// A link press must not make jsdom try to navigate the window.
const stopNavigation = (event: Event) => event.preventDefault();

beforeEach(() => {
	resetApi();
	stubFetch();
	serveShell();
	document.addEventListener("click", stopNavigation);
});
afterEach(() => {
	document.removeEventListener("click", stopNavigation);
	cleanup();
	vi.unstubAllGlobals();
	resetShell();
});

// The header, also while the open sheet hides the page behind it from
// assistive technology (getByRole skips aria-hidden elements by default).
const bannerEvenIfHidden = () => screen.getByRole("banner", { hidden: true });
const menuButton = () =>
	within(bannerEvenIfHidden()).getByRole("button", {
		name: "Abrir menu",
		hidden: true,
	});
const sheetOrNull = () => screen.queryByRole("dialog", { name: "Menu" });

/** Renders the narrow shell and opens the navigation sheet with "Abrir menu". */
async function openSheet() {
	renderShell({ width: NARROW });
	await findHeader();
	press(menuButton());
	return screen.findByRole("dialog", { name: "Menu" });
}

describe("navigation sheet", () => {
	it('AC-0008-32 narrow: Abrir menu opens the "Menu" dialog with the Agenda, Trabalho and Contas groups, Configurações disabled and Fechar; trigger expanded', async () => {
		renderShell({ width: NARROW });
		await findHeader();
		expect(menuButton().getAttribute("aria-expanded")).toBe("false");

		press(menuButton());

		const dialog = await screen.findByRole("dialog", { name: "Menu" });
		const agenda = within(dialog).getByRole("region", { name: "Agenda" });
		const work = within(dialog).getByRole("region", { name: "Trabalho" });
		const accounts = within(dialog).getByRole("region", { name: "Contas" });
		const names = (group: HTMLElement) =>
			within(group)
				.getAllByRole("button")
				.concat(within(group).queryAllByRole("link"))
				.map((el) => el.textContent?.trim());
		expect(names(agenda)).toEqual(["Agenda Rápida"]);
		expect(names(work).sort()).toEqual(
			["Clientes", "Serviços", "Pacotes e Planos", "Formulários"].sort(),
		);
		expect(names(accounts).sort()).toEqual(["Dashboard", "Faturas"]);

		const settings = within(dialog).getByRole("button", {
			name: "Configurações",
		}) as HTMLButtonElement;
		const close = within(dialog).getByRole("button", { name: "Fechar" });
		expect(settings.disabled).toBe(true);
		expect(
			settings.compareDocumentPosition(close) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			accounts.compareDocumentPosition(settings) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(menuButton().getAttribute("aria-expanded")).toBe("true");
	});

	it("AC-0008-33 the sheet marks Clientes as current and has no Barra lateral control and no profile block", async () => {
		const dialog = await openSheet();

		const clients = within(dialog).getByRole("link", { name: "Clientes" });
		expect(clients.getAttribute("aria-current")).toBe("page");
		expect(
			within(dialog)
				.getByRole("link", { name: "Serviços" })
				.getAttribute("aria-current"),
		).toBeNull();
		expect(within(dialog).queryByText("Barra lateral")).toBeNull();
		expect(
			within(dialog).queryByRole("button", { name: /barra lateral/i }),
		).toBeNull();
		expect(within(dialog).queryByText("LB")).toBeNull();
		expect(within(dialog).queryByText("user name")).toBeNull();
		expect(within(dialog).queryByText("ver perfil")).toBeNull();
	});

	it("AC-0008-34 choosing Serviços navigates and closes the sheet", async () => {
		const dialog = await openSheet();

		const services = within(dialog).getByRole("link", { name: "Serviços" });
		expect(services.getAttribute("href")).toBe(`/orgs/${ANA_ID}/services`);
		press(services);

		await waitFor(() => expect(sheetOrNull()).toBeNull());
		expect(menuButton().getAttribute("aria-expanded")).toBe("false");
	});

	it("AC-0008-35 Fechar closes the sheet and focuses Abrir menu", async () => {
		const dialog = await openSheet();

		press(within(dialog).getByRole("button", { name: "Fechar" }));

		await waitFor(() => expect(sheetOrNull()).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(menuButton()));
	});

	it("AC-0008-36 Escape closes the sheet and focuses Abrir menu", async () => {
		const dialog = await openSheet();

		pressEscape(dialog);

		await waitFor(() => expect(sheetOrNull()).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(menuButton()));
	});

	it("AC-0008-37 a press outside the sheet closes it and focuses Abrir menu", async () => {
		const dialog = await openSheet();
		// jsdom has no hit-testing: a tap beside the popup lands on the sheet's viewport
		const viewport = dialog.parentElement;
		if (!viewport || viewport === document.body) {
			throw new Error("the sheet has no viewport around its popup");
		}

		press(viewport);

		await waitFor(() => expect(sheetOrNull()).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(menuButton()));
	});

	it("AC-0008-38 while the sheet is open the page behind is aria-hidden or inert, and the trailing focus guard sends focus to the sheet's first control", async () => {
		const dialog = await openSheet();

		const hidden = (el: Element) =>
			Boolean(el.closest('[aria-hidden="true"], [inert]'));
		expect(hidden(bannerEvenIfHidden())).toBe(true);
		expect(hidden(screen.getByText("page"))).toBe(true);
		expect(hidden(dialog)).toBe(false);

		const first = Array.from(
			dialog.querySelectorAll<HTMLElement>("a[href], button"),
		).find(
			(el) =>
				el.tabIndex >= 0 &&
				!el.hasAttribute("disabled") &&
				!el.closest('[aria-hidden="true"]'),
		);
		expect(first).toBe(within(dialog).getByRole("link", { name: "Clientes" }));

		const guard = Array.from(
			document.querySelectorAll<HTMLElement>("[data-base-ui-focus-guard]"),
		).find(
			(el) =>
				dialog.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
		);
		if (!guard) throw new Error("no focus guard after the sheet");
		act(() => guard.focus());

		await waitFor(() => expect(document.activeElement).toBe(first));
	});

	it("AC-0008-39 widening to 1024px closes the sheet and the sidebar is no longer aria-hidden or inert", async () => {
		await openSheet();

		setViewport(TABLET);

		await waitFor(() => expect(sheetOrNull()).toBeNull());
		const sidebar = await screen.findByRole("navigation", {
			name: "Menu principal",
		});
		expect(sidebar.closest('[aria-hidden="true"], [inert]')).toBeNull();
		expect(headerOf().closest('[aria-hidden="true"], [inert]')).toBeNull();
	});

	it("AC-0008-40 wide: the sidebar starts with Agenda Rápida and has no profile block", async () => {
		renderShell({ width: WIDE });
		await findHeader();

		const nav = await screen.findByRole("navigation", {
			name: "Menu principal",
		});
		const aside = nav.closest("aside") ?? nav.parentElement;
		if (!aside) throw new Error("the navigation has no sidebar around it");
		const items = Array.from(
			aside.querySelectorAll<HTMLElement>("a[href], button"),
		).filter((el) => el.textContent?.trim());
		const firstEntry = items.find((el) =>
			["Agenda Rápida", "Clientes"].includes(el.textContent?.trim() ?? ""),
		);
		expect(firstEntry?.textContent?.trim()).toBe("Agenda Rápida");
		expect(
			within(aside)
				.getAllByRole("button")
				.find((b) => b.textContent?.trim()),
		).toBe(within(aside).getByRole("button", { name: "Agenda Rápida" }));
		expect(within(aside).queryByText("LB")).toBeNull();
		expect(within(aside).queryByText("user name")).toBeNull();
		expect(within(aside).queryByText("ver perfil")).toBeNull();
	});
});
