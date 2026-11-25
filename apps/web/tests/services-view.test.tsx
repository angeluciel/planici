// W-sview: SPEC-0005 AC-0005-14 (the dialog), -32, -55 (partly), -61, -62, -83,
// -84 (partly), -112, plus the archive and reactivate states of §4.4 and §8.
// The view page runs with the real service adapter and ServiceActions; the BFF
// is faked by services-harness. -55 and -84 are verified partly: no linked
// appointment exists, so `hasHistory` comes from the faked read (plan G-3).
import type { ServiceResponse } from "@planici/schemas";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceViewPage } from "@/app/[lang]/(private)/orgs/[tenant]/services/_components/service-view-page";
import {
	callsTo,
	isDisabled,
	navigatedTo,
	never,
	on,
	plain,
	press,
	renderServices,
	resetApi,
	serveService,
	serveVersion,
	service,
	servicePath,
	serviceSystemFields,
	setRoute,
	stubFetch,
	tCommon,
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

const button = (name: string, root: ParentNode = document.body) =>
	within(root as HTMLElement).queryByRole("button", { name });
const ARCHIVED_BADGE = () => screen.queryByText(ts("list.inactiveBadge"));
const post = (action: string) => callsTo("POST", `${servicePath()}/${action}`);

/** Serves the service (re-read from `box.current`) and opens its view page. */
async function openView(box: { current: ServiceResponse }) {
	serveVersion(box.current.form.version, serviceSystemFields());
	serveService(box);
	renderServices(<ServiceViewPage serviceId={box.current.id} />);
	await screen.findAllByText(box.current.name);
}

/** Registers the archive and reactivate routes, which flip `box.current` as the API would. */
function serveStatusChanges(box: { current: ServiceResponse }) {
	on("POST", `${servicePath()}/inactivate`, () => {
		box.current = { ...box.current, status: "inactive" };
		return { status: 200, body: box.current };
	});
	on("POST", `${servicePath()}/reactivate`, () => {
		box.current = { ...box.current, status: "active" };
		return { status: 200, body: box.current };
	});
}

async function openDeleteDialog() {
	press(screen.getByRole("button", { name: "Excluir" }));
	const dialog = await screen.findByRole("dialog");
	const typed = within(dialog).getByLabelText(ts("delete.confirmLabel"));
	const confirm = () => within(dialog).getByRole("button", { name: "Excluir" });
	return { dialog, typed, confirm };
}

// ----------------------------------------------------------------- display

describe("Duration and price", () => {
	it("AC-0005-61 shows the duration '45min' for a service of 45 minutes", async () => {
		await openView({
			current: service({ name: "Avaliação", durationMinutes: 45 }),
		});

		expect(screen.getByText("45min")).toBeTruthy();
	});

	it("AC-0005-62 shows the duration '2h' for a service of 120 minutes", async () => {
		await openView({
			current: service({ name: "Sessão dupla", durationMinutes: 120 }),
		});

		expect(screen.getByText("2h")).toBeTruthy();
	});

	it("AC-0005-61 shows the duration '1h 30min' and the price 'R$ 150,00' of the default service", async () => {
		await openView({ current: service() });

		expect(screen.getByText("1h 30min")).toBeTruthy();
		expect(plain(document.body.textContent)).toContain("R$ 150,00");
	});
});

// ------------------------------------------------------------------- delete

describe("Delete dialog", () => {
	it("AC-0005-32 disables [Excluir] until the typed text is the service's name", async () => {
		await openView({ current: service({ name: "Sessão individual" }) });
		const { typed, confirm } = await openDeleteDialog();

		expect(isDisabled(confirm())).toBe(true);
		fireEvent.change(typed, { target: { value: "Sessão" } });
		expect(isDisabled(confirm())).toBe(true);
		fireEvent.change(typed, { target: { value: "Sessão individual" } });
		expect(isDisabled(confirm())).toBe(false);
		fireEvent.change(typed, { target: { value: "Sessão individua" } });
		expect(isDisabled(confirm())).toBe(true);
	});

	it("AC-0005-14 sends the typed name, shows the deleted toast and returns to /services on 204", async () => {
		await openView({ current: service({ name: "Sessão individual" }) });
		on("POST", `${servicePath()}/delete`, { status: 204 });
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Sessão individual" } });

		press(confirm());

		await screen.findByText(ts("toast.deleted"));
		expect(ts("toast.deleted")).toBe("Serviço excluído");
		await waitFor(() =>
			expect(navigatedTo().join(" ")).toMatch(/\/services(\s|$|")/),
		);
		expect(post("delete")).toHaveLength(1);
		expect(post("delete")[0]?.body).toEqual({
			confirmName: "Sessão individual",
		});
	});

	it("§8 disables [Excluir] with the in-progress copy and a spinner while the request is pending", async () => {
		await openView({ current: service() });
		on("POST", `${servicePath()}/delete`, never);
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Sessão individual" } });

		press(confirm());

		const busy = await screen.findByRole("button", {
			name: ts("delete.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		expect(post("delete")).toHaveLength(1);
	});

	it("§8 shows the delete error toast and keeps the service when deleting fails with 500", async () => {
		await openView({ current: service() });
		on("POST", `${servicePath()}/delete`, {
			status: 500,
			body: { error: "unexpected" },
		});
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Sessão individual" } });

		press(confirm());

		await screen.findByText(ts("delete.error"));
		expect(screen.getAllByText("Sessão individual").length).toBeGreaterThan(0);
		expect(navigatedTo().join(" ")).not.toContain("/orgs/");
	});

	it("AC-0005-84 (partly) closes the dialog and reloads, offering only 'Arquivar' with the hint, after 409 service.has-history", async () => {
		const box = { current: service({ hasHistory: false }) };
		await openView(box);
		on("POST", `${servicePath()}/delete`, {
			status: 409,
			body: { error: "service.has-history" },
		});
		const { typed, confirm } = await openDeleteDialog();
		fireEvent.change(typed, { target: { value: "Sessão individual" } });
		// an appointment is linked meanwhile: the reload reports history
		box.current = service({ hasHistory: true });

		press(confirm());

		// the toast and the page's hint carry the same text, and the toast has its
		// own "Arquivar": query the page's actions (the hint's container)
		let page: HTMLElement | null = null;
		await waitFor(() => {
			page =
				screen
					.getAllByText(ts("delete.hasHistory"))
					.find((el) => el.tagName === "P")?.parentElement ?? null;
			expect(page).not.toBeNull();
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(button("Excluir", page as unknown as HTMLElement)).toBeNull();
		expect(button("Arquivar", page as unknown as HTMLElement)).toBeTruthy();
		expect(callsTo("GET", servicePath()).length).toBeGreaterThanOrEqual(2);
	});
});

describe("Delete offer", () => {
	it("AC-0005-55 (partly) offers no 'Excluir' and shows 'Arquivar' with the hint when the service has history", async () => {
		await openView({ current: service({ hasHistory: true }) });

		expect(screen.getByText(ts("delete.hasHistory"))).toBeTruthy();
		expect(button("Excluir")).toBeNull();
		expect(button("Arquivar")).toBeTruthy();
	});

	it("AC-0005-55 (partly) offers 'Excluir' and 'Arquivar', and no hint, when the service has no history", async () => {
		await openView({ current: service({ hasHistory: false }) });

		expect(button("Excluir")).toBeTruthy();
		expect(button("Arquivar")).toBeTruthy();
		expect(screen.queryByText(ts("delete.hasHistory"))).toBeNull();
	});
});

// ------------------------------------------------------------------ archive

describe("Arquivar", () => {
	it("AC-0005-112 sends the archive request with no dialog and the toast offers 'Desfazer'", async () => {
		const box = { current: service({ name: "Facial" }) };
		await openView(box);
		serveStatusChanges(box);

		press(screen.getByRole("button", { name: "Arquivar" }));

		await screen.findByText(ts("toast.archived"));
		expect(
			await screen.findByRole("button", { name: "Desfazer" }),
		).toBeTruthy();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(post("inactivate")).toHaveLength(1);
		await waitFor(() => expect(ARCHIVED_BADGE()).not.toBeNull());
		expect(button("Reativar")).toBeTruthy();
		expect(button("Arquivar")).toBeNull();
	});

	it("AC-0005-112 reactivates the service when 'Desfazer' is tapped", async () => {
		const box = { current: service({ name: "Facial" }) };
		await openView(box);
		serveStatusChanges(box);
		press(screen.getByRole("button", { name: "Arquivar" }));
		const undo = await screen.findByRole("button", { name: "Desfazer" });

		press(undo);

		await waitFor(() => expect(post("reactivate")).toHaveLength(1));
		await waitFor(() => expect(ARCHIVED_BADGE()).toBeNull());
		expect(button("Arquivar")).toBeTruthy();
		expect(box.current.status).toBe("active");
	});

	it("§4.4 step 1 disables the control with the in-progress copy and a spinner while the request is pending", async () => {
		await openView({ current: service() });
		on("POST", `${servicePath()}/inactivate`, never);

		press(screen.getByRole("button", { name: "Arquivar" }));

		const busy = await screen.findByRole("button", {
			name: ts("inactivate.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		expect(post("inactivate")).toHaveLength(1);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("§4.4 step 1 shows the error toast and keeps the service active when archiving fails with 500", async () => {
		await openView({ current: service() });
		on("POST", `${servicePath()}/inactivate`, {
			status: 500,
			body: { error: "unexpected" },
		});

		press(screen.getByRole("button", { name: "Arquivar" }));

		await screen.findByText(ts("inactivate.error"));
		expect(ARCHIVED_BADGE()).toBeNull();
		expect(button("Reativar")).toBeNull();
		expect(button("Arquivar")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
	});

	it("AC-0005-83 reloads the service, showing it archived, with the status-changed toast after 409 service.status-unchanged", async () => {
		const box = { current: service() };
		await openView(box);
		on("POST", `${servicePath()}/inactivate`, {
			status: 409,
			body: { error: "service.status-unchanged" },
		});
		// archived in another tab meanwhile
		box.current = service({ status: "inactive" });

		press(screen.getByRole("button", { name: "Arquivar" }));

		await screen.findByText(ts("status.unchanged"));
		expect(ts("status.unchanged")).toBe(
			"O status deste serviço já foi alterado.",
		);
		await waitFor(() => expect(ARCHIVED_BADGE()).not.toBeNull());
		expect(button("Reativar")).toBeTruthy();
		expect(callsTo("GET", servicePath()).length).toBeGreaterThanOrEqual(2);
	});
});

// --------------------------------------------------------------- reactivate

describe("Reativar", () => {
	const archived = () => ({ current: service({ status: "inactive" }) });

	it("§4.4 step 2 shows the 'Arquivado' badge and 'Reativar', and no 'Arquivar', on an archived service", async () => {
		await openView(archived());

		expect(ARCHIVED_BADGE()).not.toBeNull();
		expect(button("Reativar")).toBeTruthy();
		expect(button("Arquivar")).toBeNull();
	});

	it("§4.4 step 2 reactivates at once with no dialog, shows the toast and reloads the service as active", async () => {
		const box = archived();
		await openView(box);
		serveStatusChanges(box);

		press(screen.getByRole("button", { name: "Reativar" }));

		await screen.findByText(ts("toast.reactivated"));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(post("reactivate")).toHaveLength(1);
		await waitFor(() => expect(ARCHIVED_BADGE()).toBeNull());
		expect(button("Arquivar")).toBeTruthy();
	});

	it("§8 disables the control with the in-progress copy and a spinner while the request is pending", async () => {
		await openView(archived());
		on("POST", `${servicePath()}/reactivate`, never);

		press(screen.getByRole("button", { name: "Reativar" }));

		const busy = await screen.findByRole("button", {
			name: ts("reactivate.inProgress"),
		});
		expect(isDisabled(busy)).toBe(true);
		expect(busy.querySelector("svg")).not.toBeNull();
		expect(post("reactivate")).toHaveLength(1);
	});

	it("§8 shows the error toast and keeps the service archived when reactivating fails with 500", async () => {
		await openView(archived());
		on("POST", `${servicePath()}/reactivate`, {
			status: 500,
			body: { error: "unexpected" },
		});

		press(screen.getByRole("button", { name: "Reativar" }));

		await screen.findByText(ts("reactivate.error"));
		expect(ARCHIVED_BADGE()).not.toBeNull();
		expect(button("Reativar")).toBeTruthy();
	});
});

// ----------------------------------------------------------------- way back

describe("Way back", () => {
	it("§4.1 step 7 links the breadcrumb to the service list as 'Procedimentos/Consultas', then shows the service's name", async () => {
		const box = { current: service() };
		await openView(box);

		const nav = screen.getByRole("navigation", { name: tCommon("breadcrumb") });
		const link = within(nav).getByRole("link", {
			name: "Procedimentos/Consultas",
		});

		expect(link.getAttribute("href")).toMatch(/\/services$/);
		expect(
			within(nav).getByText(box.current.name).getAttribute("aria-current"),
		).toBe("page");
	});
});
