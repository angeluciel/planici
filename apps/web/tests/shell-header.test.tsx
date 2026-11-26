// SPEC-0008 AC-0008-01 to -05 and -44: the app header on wide and narrow
// screens (network faked by shell-harness).
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ANA_ID,
	accountTrigger,
	anaTenants,
	before,
	findHeader,
	headerOf,
	NARROW,
	orgLink,
	orgTrigger,
	renderShell,
	resetApi,
	resetShell,
	serveShell,
	stubFetch,
	tenant,
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

/** Serves a single organization named `name`, the open one. */
function serveOpenOrganization(name: string) {
	const open = tenant({ id: ANA_ID, name });
	serveShell({ tenants: [open, ...anaTenants().slice(1)] });
}

const buttonNames = (header: HTMLElement) =>
	within(header)
		.queryAllByRole("button")
		.map((button) => button.getAttribute("aria-label") ?? button.textContent);

describe("app header", () => {
	it("AC-0008-01 wide: logo image (not a link), organization link, Trocar organização, Menu da conta, in order; no menu, search, add or other /orgs link", async () => {
		renderShell({ width: WIDE });
		const header = await findHeader();

		const logo = within(header).getByRole("img", { name: "Planici" });
		const link = orgLink("Studio Ana");
		const switcher = orgTrigger();
		const account = accountTrigger();

		expect(logo.closest("a")).toBeNull();
		expect(within(header).queryByRole("link", { name: "Planici" })).toBeNull();
		expect(before(logo, link)).toBe(true);
		expect(before(link, switcher)).toBe(true);
		expect(before(switcher, account)).toBe(true);

		expect(within(link).getByText("S")).toBeTruthy();
		expect(within(link).getByText("Studio Ana")).toBeTruthy();

		expect(
			within(header).queryByRole("button", { name: "Abrir menu" }),
		).toBeNull();
		expect(buttonNames(header)).toEqual([
			"Trocar organização",
			"Menu da conta",
		]);
		const toOrgs = within(header)
			.queryAllByRole("link")
			.filter((a) => a.getAttribute("href") === "/orgs");
		expect(toOrgs).toEqual([link]);
	});

	it("AC-0008-02 narrow: organization link, Trocar organização, then a group with Abrir menu and Menu da conta; no logo, search or add", async () => {
		renderShell({ width: NARROW });
		const header = await findHeader();

		const link = orgLink("Studio Ana");
		const switcher = orgTrigger();
		const menuButton = within(header).getByRole("button", {
			name: "Abrir menu",
		});
		const account = accountTrigger();
		const group = within(header).getByRole("group");

		expect(before(link, switcher)).toBe(true);
		expect(before(switcher, group)).toBe(true);
		expect(group.contains(menuButton)).toBe(true);
		expect(group.contains(account)).toBe(true);
		expect(before(menuButton, account)).toBe(true);
		expect(group.contains(link)).toBe(false);
		expect(group.contains(switcher)).toBe(false);

		expect(within(header).queryByRole("img", { name: "Planici" })).toBeNull();
		expect(buttonNames(header)).toEqual([
			"Trocar organização",
			"Abrir menu",
			"Menu da conta",
		]);
	});

	it('AC-0008-03 an 80-character name names the link in full, followed by ", ver todas as organizações"', async () => {
		const name =
			"Clínica de Fisioterapia e Reabilitação Dra. Ana Beatriz Souza Lima e Sócios Ltda";
		expect(name).toHaveLength(80);
		serveOpenOrganization(name);

		renderShell();
		await findHeader();

		expect(
			within(headerOf()).getByRole("link", {
				name: `${name}, ver todas as organizações`,
			}),
		).toBeTruthy();
	});

	it('AC-0008-04 "ótica Lima" shows the initial "Ó"', async () => {
		serveOpenOrganization("ótica Lima");

		renderShell();
		await findHeader();

		expect(within(orgLink("ótica Lima")).getByText("Ó")).toBeTruthy();
	});

	it("AC-0008-05 the organization link goes to /orgs", async () => {
		renderShell();
		await findHeader();

		expect(orgLink("Studio Ana").getAttribute("href")).toBe("/orgs");
	});

	it("AC-0008-44 wide: the header's tabbable controls are, in document order, the organization link, Trocar organização and Menu da conta", async () => {
		renderShell({ width: WIDE });
		const header = await findHeader();

		// jsdom does not move focus on Tab: the order is the document order of
		// what Tab can stop on (the pattern of form-fields.test.tsx)
		const tabbable = Array.from(
			header.querySelectorAll<HTMLElement>(
				"input, button, select, textarea, a[href], [tabindex]",
			),
		).filter(
			(el) =>
				el.tabIndex >= 0 &&
				!el.hasAttribute("disabled") &&
				!el.closest('[aria-hidden="true"]'),
		);

		expect(tabbable).toEqual([
			orgLink("Studio Ana"),
			orgTrigger(),
			accountTrigger(),
		]);
		expect(screen.getByText("page")).toBeTruthy();
	});
});
