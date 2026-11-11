// W-dlg: SPEC-0001 AC-0001-21, -25, -28, -30, -32, -51, -56, -57, -65, -66, -67, -68
// Dialogs are driven through their hosts (editor or list), the way a user reaches them.
// Without SPEC-0002's field controls the editor's only editable draft input is the name,
// so "schema changed" comes from the mocked change preview (the editor asks the preview
// what a save would do before it saves).
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormEditor } from "@/app/[lang]/(private)/orgs/[tenant]/forms/_components/form-editor";
import { FormsList } from "@/app/[lang]/(private)/orgs/[tenant]/forms/_components/forms-list";
import {
	callsTo,
	FORM_ID,
	never,
	on,
	preview,
	renderApp,
	resetApi,
	setRoute,
	stubFetch,
	summary,
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

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({ formId: FORM_ID });
	vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const button = (
	name: string | RegExp,
	scope: HTMLElement | undefined = undefined,
) => (scope ? within(scope) : screen).getByRole("button", { name });

async function openEditor(over = {}) {
	const tpl = template(over);
	on("GET", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
	renderApp(<FormEditor formId={tpl.id} />);
	await screen.findByDisplayValue(tpl.name);
	return tpl;
}

/** Edits the name and presses Salvar; the mocked preview decides what happens next. */
async function saveWithPreview(
	tpl: ReturnType<typeof template>,
	previewBody: ReturnType<typeof preview>,
) {
	on("POST", `/api/forms/${tpl.id}/preview`, {
		status: 200,
		body: previewBody,
	});
	fireEvent.change(
		screen.getByLabelText(t("editor.name"), { selector: "input" }),
		{ target: { value: `${tpl.name} v2` } },
	);
	fireEvent.click(button(tCommon("save")));
	return screen.findByRole("dialog");
}

const draftName = (tpl: ReturnType<typeof template>) =>
	(
		screen.getByLabelText(t("editor.name"), {
			selector: "input",
		}) as HTMLInputElement
	).value === `${tpl.name} v2`;

describe("Publish dialog (template without records)", () => {
	it("AC-0001-21 asks 'Publicar versão 2?' without migration options and publishes on [Publicar]", async () => {
		const tpl = await openEditor();
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 200,
			body: { ...tpl, version: 2, revision: 2, name: "Ficha v2" },
		});

		const dialog = await saveWithPreview(
			tpl,
			preview({ schemaChanged: true, nextVersion: 2 }),
		);

		expect(
			within(dialog).getByText(t("publish.confirm", { version: 2 })),
		).toBeTruthy();
		expect(within(dialog).queryByText(t("apply.keep"))).toBeNull();
		expect(within(dialog).queryByText(t("apply.updateAll"))).toBeNull();
		expect(within(dialog).queryByRole("radio")).toBeNull();

		fireEvent.click(button(t("actions.publish"), dialog));

		await screen.findByText(t("editor.version", { version: 2 }));
		const [patch] = callsTo("PATCH", `/api/forms/${tpl.id}`);
		expect((patch?.body as { migration?: unknown }).migration).toBeUndefined();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0001-65 keeps the dialog open with the failure copy and the draft when publishing fails with a 500", async () => {
		const tpl = await openEditor();
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 500,
			body: { error: "unexpected" },
		});
		const dialog = await saveWithPreview(
			tpl,
			preview({ schemaChanged: true, nextVersion: 2 }),
		);

		fireEvent.click(button(t("actions.publish"), dialog));

		await within(dialog).findByText(t("publish.failed"));
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(draftName(tpl)).toBe(true);
	});
});

describe("Apply dialog (template with records)", () => {
	const withRecords = { recordCount: 4 };

	it("AC-0001-25 warns that 2 records lose answers and keeps [Aplicar] disabled until 'Ficha' is typed exactly", async () => {
		const tpl = await openEditor({ ...withRecords, name: "Ficha" });
		const dialog = await saveWithPreview(
			tpl,
			preview({
				schemaChanged: true,
				recordCount: 4,
				recordsLosingAnswers: 2,
				removed: [{ id: "f1", label: "Hobby", valueCount: 2 }],
			}),
		);
		expect(within(dialog).getByText(t("apply.title"))).toBeTruthy();
		expect(
			(within(dialog).getByLabelText(t("apply.keep")) as HTMLInputElement)
				.checked,
		).toBe(false);
		expect(
			(within(dialog).getByLabelText(t("apply.updateAll")) as HTMLInputElement)
				.checked,
		).toBe(false);
		expect((button("Aplicar", dialog) as HTMLButtonElement).disabled).toBe(
			true,
		);

		fireEvent.click(within(dialog).getByLabelText(t("apply.updateAll")));

		await within(dialog).findByText(t("apply.answersDeleted", { count: 2 }));
		const apply = button("Aplicar", dialog) as HTMLButtonElement;
		expect(apply.disabled).toBe(true);
		const typed = within(dialog).getByLabelText(t("apply.typeName"));
		fireEvent.change(typed, { target: { value: "ficha" } });
		expect(apply.disabled).toBe(true);
		fireEvent.change(typed, { target: { value: "Ficha" } });
		expect(apply.disabled).toBe(false);
	});

	it("AC-0001-51 shows '3 cadastros ficarão com preenchimento pendente.' after choosing 'Atualizar todos'", async () => {
		const tpl = await openEditor({ recordCount: 3 });
		const dialog = await saveWithPreview(
			tpl,
			preview({
				schemaChanged: true,
				recordCount: 3,
				recordsGainingRequiredFields: 3,
				added: [{ label: "Objetivo", type: "text", required: true }],
			}),
		);

		fireEvent.click(within(dialog).getByLabelText(t("apply.keep")));
		expect(
			within(dialog).queryByText(t("apply.pendingRequired", { count: 3 })),
		).toBeNull();
		fireEvent.click(within(dialog).getByLabelText(t("apply.updateAll")));

		expect(
			await within(dialog).findByText(t("apply.pendingRequired", { count: 3 })),
		).toBeTruthy();
	});

	it("AC-0001-28 shows the apply-failed copy and keeps the draft when 'Atualizar todos' fails with a 500", async () => {
		const tpl = await openEditor({ recordCount: 3 });
		on("PATCH", `/api/forms/${tpl.id}`, {
			status: 500,
			body: { error: "unexpected" },
		});
		const dialog = await saveWithPreview(
			tpl,
			preview({ schemaChanged: true, recordCount: 3 }),
		);

		fireEvent.click(within(dialog).getByLabelText(t("apply.updateAll")));
		fireEvent.click(button("Aplicar", dialog));

		await within(dialog).findByText(t("apply.failed"));
		const [patch] = callsTo("PATCH", `/api/forms/${tpl.id}`);
		expect(
			(patch?.body as { migration: { mode: string } }).migration.mode,
		).toBe("update_all");
		expect(draftName(tpl)).toBe(true);
	});

	it("AC-0001-56 stays open with 'Aplicando…' when Escape or an outside click arrives before the response", async () => {
		const tpl = await openEditor({ recordCount: 3 });
		on("PATCH", `/api/forms/${tpl.id}`, never);
		const dialog = await saveWithPreview(
			tpl,
			preview({ schemaChanged: true, recordCount: 3 }),
		);
		fireEvent.click(within(dialog).getByLabelText(t("apply.keep")));
		fireEvent.click(button("Aplicar", dialog));
		await within(dialog).findByText(t("apply.applying"));

		fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
		fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
		for (const type of [
			"pointerdown",
			"mousedown",
			"pointerup",
			"mouseup",
			"click",
		]) {
			fireEvent(document.body, new MouseEvent(type, { bubbles: true }));
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByText(t("apply.applying"))).toBeTruthy();
	});
});

describe("Archive and delete dialogs", () => {
	it("AC-0001-30 offers 'Sim, excluir tudo' and 'Não, arquivar o modelo' for a template with 3 records and no history", async () => {
		await openEditor({ recordCount: 3, recordsWithHistory: 0 });

		fireEvent.click(button(t("actions.delete")));

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByText(t("delete.withRecords", { count: 3 })),
		).toBeTruthy();
		expect(button(t("delete.deleteAll"), dialog)).toBeTruthy();
		expect(button(t("delete.archiveInstead"), dialog)).toBeTruthy();
		expect(button(tCommon("cancel"), dialog)).toBeTruthy();
	});

	it("AC-0001-32 'Não, arquivar o modelo' calls archive without asking for the name and never deletes", async () => {
		const tpl = await openEditor({ recordCount: 3 });
		on("POST", `/api/forms/${tpl.id}/archive`, {
			status: 200,
			body: { ...tpl, status: "archived", revision: 2 },
		});
		fireEvent.click(button(t("actions.delete")));
		const dialog = await screen.findByRole("dialog");

		fireEvent.click(button(t("delete.archiveInstead"), dialog));

		// the toast and the editor's archived banner share the copy "Modelo arquivado"
		await screen.findAllByText(t("toast.archived"));
		expect(callsTo("POST", `/api/forms/${tpl.id}/archive`)).toHaveLength(1);
		expect(callsTo("POST", `/api/forms/${tpl.id}/delete`)).toHaveLength(0);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("AC-0001-57 offers only 'Arquivar o modelo' and Cancelar when some record has history", async () => {
		await openEditor({ recordCount: 3, recordsWithHistory: 1 });

		fireEvent.click(button(t("actions.delete")));

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByText(t("delete.recordsHaveHistory", { count: 3 })),
		).toBeTruthy();
		const names = within(dialog)
			.getAllByRole("button")
			.map((b) => b.textContent?.trim())
			.filter((name) => name && name !== tCommon("close"));
		expect(names.sort()).toEqual(
			[t("delete.archiveOnly"), tCommon("cancel")].sort(),
		);
		expect(within(dialog).queryByText(t("delete.deleteAll"))).toBeNull();
	});

	it("AC-0001-66 shows the archive-failed copy and keeps the template active when archiving fails with a 500", async () => {
		const tpl = await openEditor();
		on("POST", `/api/forms/${tpl.id}/archive`, {
			status: 500,
			body: { error: "unexpected" },
		});
		fireEvent.click(button(t("actions.archive")));
		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByText(t("archive.confirm"))).toBeTruthy();

		fireEvent.click(button(t("actions.archive"), dialog));

		await within(dialog).findByText(t("archive.failed"));
		expect(screen.queryByText(t("editor.archived"))).toBeNull();
		expect(
			screen.getByRole("button", { name: t("actions.archive") }),
		).toBeTruthy();
	});

	it("AC-0001-68 shows 'cadastros mudaram' with both options when delete answers 409 form.in-use", async () => {
		const tpl = template({ name: "Ficha", recordCount: 0 });
		let reads = 0;
		on("GET", `/api/forms/${tpl.id}`, () => ({
			status: 200,
			body: ++reads === 1 ? tpl : { ...tpl, recordCount: 2 },
		}));
		on("POST", `/api/forms/${tpl.id}/delete`, {
			status: 409,
			body: { error: "form.in-use" },
		});
		renderApp(<FormEditor formId={tpl.id} />);
		await screen.findByDisplayValue("Ficha");
		fireEvent.click(button(t("actions.delete")));
		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByText(t("delete.confirm"))).toBeTruthy();

		fireEvent.change(within(dialog).getByRole("textbox"), {
			target: { value: "Ficha" },
		});
		fireEvent.click(button(t("actions.delete"), dialog));

		await within(dialog).findByText(t("delete.recordsChanged"));
		await waitFor(() =>
			expect(button(t("delete.deleteAll"), dialog)).toBeTruthy(),
		);
		expect(button(t("delete.archiveInstead"), dialog)).toBeTruthy();
		const [del] = callsTo("POST", `/api/forms/${tpl.id}/delete`);
		expect(del?.body).toEqual({ confirmName: "Ficha" });
	});
});

describe("Delete dialog from the list", () => {
	it("AC-0001-67 shows the delete-failed copy and keeps the template listed when deleting fails with a 500", async () => {
		const row = summary({ name: "Ficha" });
		on("GET", "/api/forms", { status: 200, body: { forms: [row] } });
		on("POST", `/api/forms/${row.id}/delete`, {
			status: 500,
			body: { error: "unexpected" },
		});
		renderApp(<FormsList />);
		await screen.findByText("Ficha");
		const listItem = screen
			.getAllByRole("listitem")
			.find((li) => within(li).queryByText("Ficha")) as HTMLElement;

		fireEvent.click(
			within(listItem).getByRole("button", {
				name: new RegExp(t("actions.delete"), "i"),
			}),
		);
		const dialog = await screen.findByRole("dialog");
		fireEvent.change(within(dialog).getByRole("textbox"), {
			target: { value: "Ficha" },
		});
		fireEvent.click(button(t("actions.delete"), dialog));

		await within(dialog).findByText(t("delete.failed"));
		expect(callsTo("POST", `/api/forms/${row.id}/delete`)).toHaveLength(1);
		expect(screen.getAllByText("Ficha").length).toBeGreaterThan(0);
	});
});

describe("Delete dialog for an archived template", () => {
	it("§4.6 archived with records offers 'Sim, excluir tudo' and Cancelar, without archiving", async () => {
		await openEditor({
			status: "archived",
			recordCount: 3,
			recordsWithHistory: 0,
		});

		fireEvent.click(button(t("actions.delete")));

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByText(t("delete.withRecords", { count: 3 })),
		).toBeTruthy();
		expect(button(t("delete.deleteAll"), dialog)).toBeTruthy();
		expect(button(tCommon("cancel"), dialog)).toBeTruthy();
		expect(within(dialog).queryByText(t("delete.archiveInstead"))).toBeNull();
		expect(within(dialog).queryByText(t("delete.archiveOnly"))).toBeNull();
	});

	it("§4.6 archived with records that have history offers only Cancelar", async () => {
		await openEditor({
			status: "archived",
			recordCount: 3,
			recordsWithHistory: 1,
		});

		fireEvent.click(button(t("actions.delete")));

		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByText(t("delete.recordsHaveHistory", { count: 3 })),
		).toBeTruthy();
		const names = within(dialog)
			.getAllByRole("button")
			.map((b) => b.textContent?.trim())
			.filter((name) => name && name !== tCommon("close"));
		expect(names).toEqual([tCommon("cancel")]);
	});
});
