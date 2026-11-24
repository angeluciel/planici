// W-cview: SPEC-0004 AC-0004-14 (the dialog), -33 (partly), -64 to -70, -71
// (partly), AC-0002-23 (masked through protected-value) and SPEC-0003
// AC-0003-97 and -98 (partly: the client page's trail and back link). The view page runs
// with the real client adapter and ClientActions; the BFF is faked by
// clients-harness. -33 and -71 are partly verified: no linked appointment
// exists, so `hasHistory` comes from the faked read (plan G-2).
import type { ClientResponse } from "@planici/schemas";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientViewPage } from "@/app/[lang]/(private)/orgs/[tenant]/clients/_components/client-view-page";
import {
	callsTo,
	client,
	clientPath,
	field,
	isDisabled,
	MASK,
	navigatedTo,
	never,
	on,
	renderApp,
	resetApi,
	serveClient,
	serveVersion,
	setRoute,
	stubFetch,
	systemFieldsOf,
	TENANT,
	tCommon,
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
const button = (name: string, root: ParentNode = document.body) =>
	within(root as HTMLElement).queryByRole("button", { name });
const INACTIVE_BADGE = () => screen.queryByText(tc("list.inactiveBadge"));
const post = (action: string) => callsTo("POST", `${clientPath()}/${action}`);

/** Serves the client (re-read from `box.current`) and opens its view page. */
async function openView(
	box: { current: ClientResponse },
	customs: ReturnType<typeof field>[] = [],
) {
	serveVersion(box.current.form.version, [
		...systemFieldsOf("clients"),
		...customs,
	]);
	serveClient(box);
	renderApp(<ClientViewPage clientId={box.current.id} />);
	await screen.findAllByText(box.current.name);
}

async function confirmInactivate() {
	press(screen.getByRole("button", { name: tc("inactivate.action") }));
	const dialog = await screen.findByRole("dialog");
	expect(
		within(dialog).getByText(tc("inactivate.confirm", { name: "Ana Souza" })),
	).toBeTruthy();
	press(
		within(dialog).getByRole("button", {
			name: tc("inactivate.confirmButton"),
		}),
	);
}

async function openDeleteDialog() {
	press(screen.getByRole("button", { name: tc("delete.action") }));
	const dialog = await screen.findByRole("dialog");
	const typed = within(dialog).getByLabelText(tc("delete.confirmLabel"));
	const confirm = () =>
		within(dialog).getByRole("button", { name: tc("delete.action") });
	return { dialog, typed, confirm };
}

// ------------------------------------------------------------------- delete

describe("Delete dialog", () => {
	it("AC-0004-14 enables [Excluir] only when the typed text is the client's exact name", async () => {
		await openView({ current: client() });
		const { typed, confirm } = await openDeleteDialog();

		expect(isDisabled(confirm())).toBe(true);
		fireEvent.change(typed, { target: { value: "Ana" } });
		expect(isDisabled(confirm())).toBe(true);
		fireEvent.change(typed, { target: { value: "Ana Souza" } });
		expect(isDisabled(confirm())).toBe(false);
		fireEvent.change(typed, { target: { value: "Ana Souz" } });
		expect(isDisabled(confirm())).toBe(true);
	});

	it("AC-0004-14 sends the typed name, then shows the deleted toast and returns to /clients on 204", async () => {
		await openView({ current: client() });
		on("POST", `${clientPath()}/delete`, { status: 204 });
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Ana Souza" } });

		press(confirm());

		await screen.findByText(tc("toast.deleted"));
		await waitFor(() =>
			expect(navigatedTo().join(" ")).toMatch(/\/clients(\s|$|")/),
		);
		expect(post("delete")).toHaveLength(1);
		expect(post("delete")[0]?.body).toEqual({ confirmName: "Ana Souza" });
	});

	it("AC-0004-68 disables [Excluir] with the in-progress copy and a spinner while the request is pending", async () => {
		await openView({ current: client() });
		on("POST", `${clientPath()}/delete`, never);
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Ana Souza" } });

		press(confirm());

		const busy = await screen.findByRole("button", {
			name: tc("delete.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		expect(post("delete")).toHaveLength(1);
	});

	it("AC-0004-69 shows the delete error toast and keeps the client when deleting fails with 500", async () => {
		await openView({ current: client() });
		on("POST", `${clientPath()}/delete`, {
			status: 500,
			body: { error: "unexpected" },
		});
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Ana Souza" } });

		press(confirm());

		await screen.findByText(tc("delete.error"));
		expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
		expect(navigatedTo().join(" ")).not.toContain("/orgs/");
		expect(post("delete")).toHaveLength(1);
	});

	it("AC-0004-71 (partly) closes the dialog and reloads, offering only Inativar with the hint, after 409 client.has-history", async () => {
		const box = { current: client({ hasHistory: false }) };
		await openView(box);
		on("POST", `${clientPath()}/delete`, {
			status: 409,
			body: { error: "client.has-history" },
		});
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Ana Souza" } });
		// an appointment is linked meanwhile: the reload reports history
		box.current = client({ hasHistory: true });

		press(confirm());

		await screen.findByText(tc("delete.hasHistory"));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(button(tc("delete.action"))).toBeNull();
		expect(button(tc("inactivate.action"))).toBeTruthy();
		expect(callsTo("GET", clientPath()).length).toBeGreaterThanOrEqual(2);
	});
});

describe("Delete offer", () => {
	it("AC-0004-33 (partly) offers no Excluir and shows Inativar with the hint when the client has history", async () => {
		await openView({ current: client({ hasHistory: true }) });

		expect(screen.getByText(tc("delete.hasHistory"))).toBeTruthy();
		expect(button(tc("delete.action"))).toBeNull();
		expect(button(tc("inactivate.action"))).toBeTruthy();
	});
});

// ----------------------------------------------------------------- inactivate

describe("Inativar", () => {
	it("AC-0004-64 disables the button with the in-progress copy and a spinner while the request is pending", async () => {
		await openView({ current: client() });
		on("POST", `${clientPath()}/inactivate`, never);

		await confirmInactivate();

		const busy = await screen.findByRole("button", {
			name: tc("inactivate.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		expect(post("inactivate")).toHaveLength(1);
	});

	it("AC-0004-65 shows the error toast and keeps the client active when inactivating fails with 500", async () => {
		await openView({ current: client() });
		on("POST", `${clientPath()}/inactivate`, {
			status: 500,
			body: { error: "unexpected" },
		});

		await confirmInactivate();

		await screen.findByText(tc("inactivate.error"));
		expect(INACTIVE_BADGE()).toBeNull();
		expect(button(tc("reactivate.action"))).toBeNull();
		expect(button(tc("inactivate.action"))).toBeTruthy();
		expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
	});

	it("AC-0004-70 reloads the client, showing it inactive, with the status-changed toast after 409 client.status-unchanged", async () => {
		const box = { current: client() };
		await openView(box);
		on("POST", `${clientPath()}/inactivate`, {
			status: 409,
			body: { error: "client.status-unchanged" },
		});
		// inactivated in another tab meanwhile
		box.current = client({ status: "inactive" });

		await confirmInactivate();

		await screen.findByText(tc("status.unchanged"));
		await waitFor(() => expect(INACTIVE_BADGE()).not.toBeNull());
		expect(button(tc("reactivate.action"))).toBeTruthy();
		expect(callsTo("GET", clientPath()).length).toBeGreaterThanOrEqual(2);
	});
});

// ----------------------------------------------------------------- reactivate

describe("Reativar", () => {
	const inactive = () => ({ current: client({ status: "inactive" }) });

	it("AC-0004-67 disables the button with the in-progress copy and a spinner while the request is pending", async () => {
		await openView(inactive());
		on("POST", `${clientPath()}/reactivate`, never);

		press(screen.getByRole("button", { name: tc("reactivate.action") }));

		const busy = await screen.findByRole("button", {
			name: tc("reactivate.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		// no confirmation dialog for a reactivation
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(post("reactivate")).toHaveLength(1);
	});

	it("AC-0004-66 shows the error toast and keeps the client inactive when reactivating fails with 500", async () => {
		await openView(inactive());
		on("POST", `${clientPath()}/reactivate`, {
			status: 500,
			body: { error: "unexpected" },
		});

		press(screen.getByRole("button", { name: tc("reactivate.action") }));

		await screen.findByText(tc("reactivate.error"));
		expect(INACTIVE_BADGE()).not.toBeNull();
		expect(button(tc("reactivate.action"))).toBeTruthy();
		expect(button(tc("inactivate.action"))).toBeNull();
	});
});

// ------------------------------------------------------------ protected value

describe("Protected value", () => {
	it("AC-0002-23 masks a sensitive custom value until Mostrar is pressed", async () => {
		const hobby = field({ label: "Hobby", type: "text", sensitive: true });
		await openView({ current: client({ values: { [hobby.id]: "Pintura" } }) }, [
			hobby,
		]);

		expect(document.body.textContent).toContain(MASK);
		expect(screen.queryByText("Pintura")).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: `${tc("view.reveal")} Hobby` }),
		);

		expect(await screen.findByText("Pintura")).toBeTruthy();
	});
});

// ----------------------------------------------------- way back (SPEC-0003 §4.2)

describe("Way back", () => {
	const LIST = `/orgs/${TENANT}/clients`;

	it("AC-0003-97 (partly) links the breadcrumb to the client list with clients.list.title, then shows the client's name", async () => {
		const box = { current: client() };
		await openView(box);

		const nav = screen.getByRole("navigation", {
			name: tCommon("breadcrumb"),
		});
		const link = within(nav).getByRole("link", { name: tc("list.title") });
		expect(link.getAttribute("href")).toBe(LIST);
		expect(
			within(nav).getByText(box.current.name).getAttribute("aria-current"),
		).toBe("page");
	});

	it("AC-0003-98 (partly) links Voltar to the client list", async () => {
		await openView({ current: client() });

		const back = screen.getByRole("link", { name: tc("form.back") });
		expect(back.getAttribute("href")).toBe(LIST);
	});
});
