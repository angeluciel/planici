// SPEC-0008 AC-0008-20 to -31, -41, -42, -45, -46: the account menu behind
// "Menu da conta" (network faked by shell-harness; themes through next-themes,
// the consent sync and the document's data-theme).
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accountTrigger,
	before,
	CLIENTS_PATH,
	callsTo,
	expireSession,
	findHeader,
	ME,
	NARROW,
	navigatedTo,
	networkDown,
	never,
	on,
	press,
	pressEscape,
	renderShell,
	resetApi,
	resetShell,
	SIGN_OUT,
	serveShell,
	setDeviceTheme,
	stubFetch,
	unexpected,
	wentToSignIn,
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

const NETWORK_TEXT =
	"Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.";

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

async function openMenu() {
	press(accountTrigger());
	return screen.findByRole("menu");
}

const settle = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
	});

const themeOf = () => document.documentElement.getAttribute("data-theme");

const themeItem = (menu: HTMLElement, name: string) =>
	within(menu).getByRole("menuitemradio", { name });

const isChecked = (el: HTMLElement) =>
	el.getAttribute("aria-checked") === "true";

const isDisabledItem = (el: HTMLElement) =>
	el.getAttribute("aria-disabled") === "true";

const signOuts = () => callsTo(...SIGN_OUT);

// ------------------------------------------------------------------- content

describe("account menu", () => {
	it('AC-0008-20 Menu da conta opens with a group named "ana@example.com" holding Perfil, then Tema (Sistema, Escuro, Claro) and Sair, in order, with separators; the e-mail is not a menu item', async () => {
		await mount();

		const menu = await openMenu();

		const email = await within(menu).findByRole("group", {
			name: "ana@example.com",
		});
		const emailText = within(menu).getByText("ana@example.com");
		const profile = within(menu).getByRole("menuitem", { name: "Perfil" });
		const theme = within(menu).getByRole("group", { name: "Tema" });
		const system = themeItem(menu, "Sistema");
		const dark = themeItem(menu, "Escuro");
		const light = themeItem(menu, "Claro");
		const signOut = within(menu).getByRole("menuitem", { name: "Sair" });
		const separators = within(menu).getAllByRole("separator");

		expect(email.contains(profile)).toBe(true);
		expect(
			theme.contains(system) && theme.contains(dark) && theme.contains(light),
		).toBe(true);
		expect(separators).toHaveLength(3);
		const [first, second, third] = separators as [
			HTMLElement,
			HTMLElement,
			HTMLElement,
		];
		const inOrder = [
			emailText,
			first,
			profile,
			second,
			theme,
			system,
			dark,
			light,
			third,
			signOut,
		];
		for (let i = 1; i < inOrder.length; i += 1) {
			expect(before(inOrder[i - 1] as Node, inOrder[i] as Node)).toBe(true);
		}
		// the e-mail is text, not an entry that can be chosen
		for (const item of menu.querySelectorAll('[role^="menuitem"]')) {
			expect(item.textContent).not.toContain("ana@example.com");
		}
	});

	it('AC-0008-21 while the user is pending the e-mail line shows "Carregando"', async () => {
		on(...ME, never);
		await mount();

		const menu = await openMenu();

		expect(await within(menu).findByText("Carregando")).toBeTruthy();
		expect(within(menu).queryByText("ana@example.com")).toBeNull();
	});

	it("AC-0008-22 an unexpected or unreachable user request leaves the e-mail line out and the entries work", async () => {
		for (const failure of [unexpected, networkDown]) {
			resetApi();
			serveShell();
			on(...ME, failure);
			const view = await mount();

			const menu = await openMenu();
			await waitFor(() =>
				expect(within(menu).queryByText("Carregando")).toBeNull(),
			);

			expect(within(menu).queryByText("ana@example.com")).toBeNull();
			const entries = [
				within(menu).getByRole("menuitem", { name: "Perfil" }),
				themeItem(menu, "Sistema"),
				themeItem(menu, "Escuro"),
				themeItem(menu, "Claro"),
				within(menu).getByRole("menuitem", { name: "Sair" }),
			];
			for (const entry of entries) expect(isDisabledItem(entry)).toBe(false);

			// the entries still work: a theme can be chosen
			press(themeItem(menu, "Escuro"));
			await waitFor(() => expect(themeOf()).toBe("dark"));

			view.unmount();
			resetShell();
		}
	});

	it("AC-0008-23 Perfil goes to /@me", async () => {
		await mount();
		const menu = await openMenu();

		const profile = await within(menu).findByRole("menuitem", {
			name: "Perfil",
		});

		expect(profile.getAttribute("href")).toBe("/@me");
	});

	it("AC-0008-41 narrow: the account menu is a menu, not a dialog", async () => {
		await mount({ width: NARROW });

		const menu = await openMenu();

		expect(menu.getAttribute("role")).toBe("menu");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0008-42 Escape closes the account menu and focuses Menu da conta", async () => {
		await mount();
		const menu = await openMenu();
		await within(menu).findByText("ana@example.com");

		pressEscape(document.activeElement ?? menu);

		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(accountTrigger()));
	});

	it("AC-0008-45 en-US shows Profile, Theme, System, Dark, Light and Sign out", async () => {
		await mount({ locale: "en-US" });
		press(
			within(screen.getByRole("banner")).getByRole("button", {
				name: "Account menu",
			}),
		);
		const menu = await screen.findByRole("menu");

		expect(
			await within(menu).findByRole("menuitem", { name: "Profile" }),
		).toBeTruthy();
		const theme = within(menu).getByRole("group", { name: "Theme" });
		for (const name of ["System", "Dark", "Light"]) {
			expect(theme.contains(themeItem(menu, name))).toBe(true);
		}
		expect(
			within(menu).getByRole("menuitem", { name: "Sign out" }),
		).toBeTruthy();
	});

	it("AC-0008-46 an expired session on the user request goes to sign-in with the current page as next", async () => {
		await mount();
		expireSession(...ME);

		press(accountTrigger());

		await waitFor(() => expect(wentToSignInFor(CLIENTS_PATH)).toBe(true));
	});
});

// -------------------------------------------------------------------- theme

describe("account menu theme", () => {
	it("AC-0008-24 with nothing stored and a dark device, Sistema is checked and data-theme is dark", async () => {
		setDeviceTheme("dark");
		await mount();

		const menu = await openMenu();

		await waitFor(() => expect(themeOf()).toBe("dark"));
		expect(isChecked(themeItem(menu, "Sistema"))).toBe(true);
		expect(isChecked(themeItem(menu, "Escuro"))).toBe(false);
		expect(isChecked(themeItem(menu, "Claro"))).toBe(false);
	});

	it("AC-0008-25 choosing Escuro sets data-theme dark, checks Escuro and keeps the menu open", async () => {
		setDeviceTheme("light");
		await mount();
		const menu = await openMenu();
		await waitFor(() => expect(themeOf()).toBe("light"));

		press(themeItem(menu, "Escuro"));

		await waitFor(() => expect(themeOf()).toBe("dark"));
		await waitFor(() =>
			expect(isChecked(themeItem(menu, "Escuro"))).toBe(true),
		);
		expect(isChecked(themeItem(menu, "Sistema"))).toBe(false);
		expect(screen.getByRole("menu")).toBe(menu);
	});

	it("AC-0008-26 with preferences consent, Escuro survives a remount", async () => {
		setDeviceTheme("light");
		const view = await mount({ preferences: true });
		const menu = await openMenu();
		press(themeItem(menu, "Escuro"));
		await waitFor(() => expect(themeOf()).toBe("dark"));

		// reload: unmount and mount again; the document starts clean
		view.unmount();
		document.documentElement.removeAttribute("data-theme");
		await mount({ preferences: true });
		const again = await openMenu();

		await waitFor(() => expect(themeOf()).toBe("dark"));
		expect(isChecked(themeItem(again, "Escuro"))).toBe(true);
	});

	it("AC-0008-27 without preferences consent, a remount falls back to Sistema and the light device theme", async () => {
		setDeviceTheme("light");
		const view = await mount({ preferences: false });
		const menu = await openMenu();
		press(themeItem(menu, "Escuro"));
		await waitFor(() => expect(themeOf()).toBe("dark"));
		await settle();

		// reload: unmount and mount again; the document starts clean
		view.unmount();
		document.documentElement.removeAttribute("data-theme");
		await mount({ preferences: false });
		const again = await openMenu();

		await waitFor(() => expect(themeOf()).toBe("light"));
		expect(isChecked(themeItem(again, "Sistema"))).toBe(true);
		expect(isChecked(themeItem(again, "Escuro"))).toBe(false);
	});
});

// ------------------------------------------------------------------ sign-out

describe("account menu sign-out", () => {
	it("AC-0008-28 Sair signs out and goes to /login", async () => {
		await mount();
		const menu = await openMenu();

		press(await within(menu).findByRole("menuitem", { name: "Sair" }));

		await waitFor(() => expect(wentToSignIn()).toBe(true));
		expect(signOuts()).toHaveLength(1);
	});

	it("AC-0008-29 a 500 on sign-out still goes to /login", async () => {
		on(...SIGN_OUT, { status: 500, body: { error: "unexpected" } });
		await mount();
		const menu = await openMenu();

		press(await within(menu).findByRole("menuitem", { name: "Sair" }));

		await waitFor(() => expect(wentToSignIn()).toBe(true));
		expect(signOuts()).toHaveLength(1);
	});

	it('AC-0008-30 while sign-out is pending the entry reads "Saindo…", is disabled and sends no second request', async () => {
		on(...SIGN_OUT, never);
		await mount();
		const menu = await openMenu();

		press(await within(menu).findByRole("menuitem", { name: "Sair" }));

		const busy = await within(menu).findByRole("menuitem", { name: "Saindo…" });
		expect(isDisabledItem(busy)).toBe(true);
		press(busy);
		await settle();
		expect(signOuts()).toHaveLength(1);
		expect(navigatedTo()).toEqual([]);
	});

	it("AC-0008-31 an unreachable server on sign-out shows the network toast and restores Sair", async () => {
		on(...SIGN_OUT, networkDown);
		await mount();
		const menu = await openMenu();

		press(await within(menu).findByRole("menuitem", { name: "Sair" }));

		expect(await screen.findByText(NETWORK_TEXT)).toBeTruthy();
		expect(navigatedTo()).toEqual([]);
		const again = await within(menu).findByRole("menuitem", { name: "Sair" });
		expect(isDisabledItem(again)).toBe(false);
		expect(
			within(menu).queryByRole("menuitem", { name: "Saindo…" }),
		).toBeNull();
	});
});
