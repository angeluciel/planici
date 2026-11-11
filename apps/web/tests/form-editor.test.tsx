// W-ed: SPEC-0001 AC-0001-01, -08, -10, -11, -18, -20, -50, -55, -63, -64, -69, -77, -79
// and the out-of-table check "§4.2 step 7" (browser back).
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormEditor } from "@/app/[lang]/(private)/orgs/[tenant]/forms/_components/form-editor";
import {
	callsTo,
	clientFields,
	FORM_ID,
	navigatedTo,
	never,
	on,
	preview,
	renderApp,
	resetApi,
	router,
	setRoute,
	stubFetch,
	t,
	tCommon,
	template,
} from "./forms-harness";

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

let confirm: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({ formId: FORM_ID });
	// the leave guard uses an in-app dialog; window.confirm must stay unused
	confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const nameInput = () =>
	screen.getByLabelText(t("editor.name"), { selector: "input" });
const save = () => screen.getByRole("button", { name: tCommon("save") });

async function openExisting(over = {}) {
	const tpl = template(over);
	on("GET", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
	renderApp(<FormEditor formId={tpl.id} />);
	await screen.findByDisplayValue(tpl.name);
	return tpl;
}

function rename(value: string) {
	fireEvent.change(nameInput(), { target: { value } });
}

async function chooseType(label: string) {
	const radio = screen.queryByRole("radio", { name: label });
	if (radio) return fireEvent.click(radio);
	const control = screen.getByLabelText(t("editor.type"));
	if (control instanceof HTMLSelectElement) {
		const option = within(control).getByRole("option", { name: label });
		return fireEvent.change(control, {
			target: { value: (option as HTMLOptionElement).value },
		});
	}
	fireEvent.click(control);
	fireEvent.click(await screen.findByRole("option", { name: label }));
}

async function leaveDialog(): Promise<HTMLElement> {
	return waitFor(() => {
		const el =
			screen.queryByRole("dialog") ?? screen.queryByRole("alertdialog");
		if (!el) throw new Error("leave dialog not shown");
		return el;
	});
}

const hasText = (text: string) =>
	screen.queryAllByText(text).length +
		screen.queryAllByDisplayValue(text).length >
	0;

describe("FormEditor: create", () => {
	beforeEach(() => setRoute({}));

	it("AC-0001-01 creates a client template sending the client system fields in order and shows 'Versão 1'", async () => {
		on("POST", "/api/forms", (call) => {
			const body = call.body as { name: string };
			return {
				status: 201,
				body: template({ name: body.name, version: 1, revision: 1 }),
			};
		});
		renderApp(<FormEditor />);

		await chooseType(t("editor.typeClient"));
		fireEvent.change(nameInput(), { target: { value: "Anamnese inicial" } });
		fireEvent.click(save());

		await screen.findByText(t("editor.version", { version: 1 }));
		const [post] = callsTo("POST", "/api/forms");
		const body = post?.body as {
			type: string;
			name: string;
			fields: { label: string; type: string; sensitive?: boolean }[];
		};
		expect(body.type).toBe("client");
		expect(body.name).toBe("Anamnese inicial");
		expect(body.fields.map((f) => [f.label, f.type])).toEqual([
			["Nome completo", "full_name"],
			["E-mail", "email"],
			["Telefone", "phone"],
		]);
		expect(body.fields.every((f) => f.sensitive === undefined)).toBe(true);
	});

	it("AC-0001-50 swaps the system fields when the type changes before the first save and keeps the custom field 'Objetivo'", async () => {
		renderApp(
			<FormEditor
				initialDraft={{
					type: "client",
					fields: [
						{
							label: "Nome completo",
							type: "full_name",
							required: true,
							systemKey: "client.name",
						},
						{
							label: "E-mail",
							type: "email",
							required: true,
							systemKey: "client.email",
						},
						{ label: "Telefone", type: "phone", systemKey: "client.phone" },
						{ label: "Objetivo", type: "text" },
					],
				}}
			/>,
		);
		await waitFor(() => expect(hasText("Nome completo")).toBe(true));
		expect(hasText("Objetivo")).toBe(true);

		await chooseType(t("editor.typeService"));

		await waitFor(() => expect(hasText("Duração (minutos)")).toBe(true));
		expect(hasText("Preço")).toBe(true);
		expect(hasText("Nome completo")).toBe(false);
		expect(hasText("E-mail")).toBe(false);
		expect(hasText("Telefone")).toBe(false);
		expect(hasText("Objetivo")).toBe(true);
	});

	it("AC-0001-10 after saving from the /clients shortcut goes to the new-client page for the new template", async () => {
		setRoute({ search: "type=client&from=clients" });
		const created = template({ name: "Ficha nutricional" });
		on("POST", "/api/forms", { status: 201, body: created });
		renderApp(<FormEditor type="client" from="clients" />);

		fireEvent.change(nameInput(), { target: { value: "Ficha nutricional" } });
		fireEvent.click(save());

		await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
		const target = navigatedTo().join(" ");
		expect(target).toContain("/clients/new");
		expect(target).toContain(created.id);
		const [post] = callsTo("POST", "/api/forms");
		expect((post?.body as { type: string }).type).toBe("client");
	});

	it("AC-0001-11 Cancelar from the /clients shortcut returns to /clients and sends no write", async () => {
		setRoute({ search: "type=client&from=clients" });
		renderApp(<FormEditor type="client" from="clients" />);

		fireEvent.click(screen.getByRole("button", { name: tCommon("cancel") }));

		await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
		const target = navigatedTo().join(" ");
		expect(target).toMatch(/\/clients(?!\/new)/);
		expect(target).not.toContain("/forms");
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(screen.queryByText(t("editor.unsaved"))).toBeNull();
		expect(
			callsTo("POST", "/api/forms").length +
				callsTo("PATCH", `/api/forms/${FORM_ID}`).length,
		).toBe(0);
	});
});

describe("FormEditor: existing template", () => {
	it("AC-0001-08 shows the conflict banner and keeps local edits when the save is rejected with a stale revision", async () => {
		const tpl = await openExisting({ revision: 3 });
		on("POST", `/api/forms/${tpl.id}/preview`, {
			status: 200,
			body: preview(),
		});
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 409,
			body: { error: "form.revision-conflict", field: "revision" },
		});

		rename("Ficha editada");
		fireEvent.click(save());

		await screen.findByText(t("editor.conflict"));
		expect((nameInput() as HTMLInputElement).value).toBe("Ficha editada");
		expect(
			screen.getByRole("button", { name: t("actions.reload") }),
		).toBeTruthy();
		const [patch] = callsTo("PATCH", `/api/forms/${tpl.id}`);
		expect((patch?.body as { revision: number }).revision).toBe(3);
	});

	it("AC-0001-18 shows the leave dialog on an in-app link with unsaved changes; Cancelar keeps the draft and Descartar follows the link", async () => {
		await openExisting();
		const other = document.createElement("a");
		other.href = "/pt-BR/orgs/studio-ana-4f9k2m7x1q/clients";
		other.textContent = "outra página";
		document.body.appendChild(other);
		rename("Ficha editada");

		const notPrevented = fireEvent.click(other);

		const dialog = await leaveDialog();
		expect(within(dialog).getByText(t("editor.unsaved"))).toBeTruthy();
		expect(notPrevented).toBe(false);
		expect(navigatedTo()).toHaveLength(0);
		expect(confirm).not.toHaveBeenCalled();

		fireEvent.click(
			within(dialog).getByRole("button", { name: tCommon("cancel") }),
		);

		await waitFor(() =>
			expect(screen.queryByText(t("editor.unsaved"))).toBeNull(),
		);
		expect((nameInput() as HTMLInputElement).value).toBe("Ficha editada");
		expect(navigatedTo()).toHaveLength(0);

		fireEvent.click(other);
		const again = await leaveDialog();
		fireEvent.click(
			within(again).getByRole("button", { name: t("editor.discard") }),
		);

		await waitFor(() => expect(navigatedTo().length).toBeGreaterThan(0));
		expect(navigatedTo().join(" ")).toContain(
			"/orgs/studio-ana-4f9k2m7x1q/clients",
		);
		other.remove();
	});

	it("§4.2 step 7 browser back with unsaved changes shows the leave dialog; Cancelar keeps the draft and the URL", async () => {
		const url = `/pt-BR/orgs/studio-ana-4f9k2m7x1q/forms/${FORM_ID}`;
		window.history.replaceState({}, "", url);
		await openExisting();
		rename("Ficha editada");

		window.history.back();

		const dialog = await leaveDialog();
		expect(within(dialog).getByText(t("editor.unsaved"))).toBeTruthy();
		fireEvent.click(
			within(dialog).getByRole("button", { name: tCommon("cancel") }),
		);

		await waitFor(() =>
			expect(screen.queryByText(t("editor.unsaved"))).toBeNull(),
		);
		expect(window.location.pathname).toBe(url);
		expect((nameInput() as HTMLInputElement).value).toBe("Ficha editada");
		expect(router.back).not.toHaveBeenCalled();
	});

	it("AC-0001-20 a metadata-only save shows 'Alterações salvas' and neither the publish nor the Apply dialog", async () => {
		const tpl = await openExisting({ version: 2, revision: 4, recordCount: 5 });
		on("POST", `/api/forms/${tpl.id}/preview`, {
			status: 200,
			body: preview({ schemaChanged: false, nextVersion: 3, recordCount: 5 }),
		});
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 200,
			body: { ...tpl, name: "Ficha renomeada", revision: 5 },
		});

		rename("Ficha renomeada");
		fireEvent.click(save());

		await screen.findByText(t("editor.saved"));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByText(t("editor.version", { version: 2 }))).toBeTruthy();
		const [patch] = callsTo("PATCH", `/api/forms/${tpl.id}`);
		const body = patch?.body as Record<string, unknown>;
		expect(body.revision).toBe(4);
		expect(body.name).toBe("Ficha renomeada");
		expect(body.migration).toBeUndefined();
	});

	it("AC-0001-55 shows 'Modelo não encontrado.' with a link back to /forms for an unknown id", async () => {
		on("GET", `/api/forms/${FORM_ID}`, {
			status: 404,
			body: { error: "form.not-found" },
		});

		renderApp(<FormEditor formId={FORM_ID} />);

		await screen.findByText(t("editor.notFound"));
		const back = screen.getByRole("link", { name: tCommon("back") });
		expect(back.getAttribute("href")).toMatch(/\/forms$/);
	});

	it("AC-0001-63 shows the load error with a retry that reads the template again", async () => {
		let attempt = 0;
		on("GET", `/api/forms/${FORM_ID}`, () =>
			++attempt === 1
				? { status: 500, body: { error: "unexpected" } }
				: { status: 200, body: template({ name: "Ficha" }) },
		);

		renderApp(<FormEditor formId={FORM_ID} />);

		await screen.findByText(t("editor.loadError"));
		fireEvent.click(screen.getByRole("button", { name: t("actions.retry") }));

		await screen.findByDisplayValue("Ficha");
		expect(callsTo("GET", `/api/forms/${FORM_ID}`)).toHaveLength(2);
	});

	it("AC-0001-64 shows the save-failed copy and keeps the changed name after a 500 on a name-only save", async () => {
		const tpl = await openExisting();
		on("POST", `/api/forms/${tpl.id}/preview`, {
			status: 200,
			body: preview(),
		});
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 500,
			body: { error: "unexpected" },
		});

		rename("Ficha nova");
		fireEvent.click(save());

		await screen.findByText(t("editor.saveFailed"));
		expect((nameInput() as HTMLInputElement).value).toBe("Ficha nova");
	});

	it("AC-0001-69 shows a toast and keeps the archived banner when unarchiving fails with a 500", async () => {
		const tpl = await openExisting({ status: "archived" });
		on("POST", `/api/forms/${tpl.id}/unarchive`, {
			status: 500,
			body: { error: "unexpected" },
		});
		expect(screen.getByText(t("editor.archived"))).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: t("actions.unarchive") }),
		);

		await screen.findByText(t("unarchive.failed"));
		expect(screen.getByText(t("editor.archived"))).toBeTruthy();
		expect(callsTo("POST", `/api/forms/${tpl.id}/unarchive`)).toHaveLength(1);
	});

	it("AC-0001-77 shows the 'Versão 3' badge and the record counts on this and older versions", async () => {
		await openExisting({
			version: 3,
			recordCount: 3,
			recordsOnOlderVersions: 2,
			fields: clientFields(),
		});

		expect(screen.getByText(t("editor.version", { version: 3 }))).toBeTruthy();
		expect(
			screen.getByText(t("editor.recordCounts", { current: 1, older: 2 })),
		).toBeTruthy();
	});

	it("AC-0001-79 shows a header skeleton and exactly 3 field-row skeletons, named by the loading copy, while the template is pending", async () => {
		on("GET", `/api/forms/${FORM_ID}`, never);

		renderApp(<FormEditor formId={FORM_ID} />);

		const region = await screen.findByLabelText(t("editor.loading"));
		expect(within(region).getAllByTestId("form-field-skeleton")).toHaveLength(
			3,
		);
		// header skeleton test id is not fixed by the plan; assumed
		expect(within(region).getByTestId("form-header-skeleton")).toBeTruthy();
		expect(screen.queryByDisplayValue("Ficha")).toBeNull();
	});
});

describe("SPEC-0002 input rules on update requests", () => {
	it("SPEC-0002 input rules: preview and PATCH carry no systemKey and no sensitive on system fields", async () => {
		const tpl = await openExisting();
		on("POST", `/api/forms/${tpl.id}/preview`, {
			status: 200,
			body: preview(),
		});
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 200,
			body: { ...tpl, name: "Ficha nova", revision: 2 },
		});

		rename("Ficha nova");
		fireEvent.click(save());
		await screen.findByText(t("editor.saved"));

		for (const call of [
			...callsTo("POST", `/api/forms/${tpl.id}/preview`),
			...callsTo("PATCH", `/api/forms/${tpl.id}`),
		]) {
			const fields = (call.body as { fields: Record<string, unknown>[] })
				.fields;
			expect(fields.length).toBeGreaterThan(0);
			for (const field of fields) {
				expect("systemKey" in field).toBe(false);
				expect("sensitive" in field).toBe(false);
			}
		}
	});
});
