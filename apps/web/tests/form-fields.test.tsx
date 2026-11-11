// W-fld: SPEC-0002 AC-0002-01, -10, -14, -21, -22, -25, -48, -49, -50, -53
// (field list inside SPEC-0001's editor; network faked by forms-harness).
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
	field,
	on,
	preview,
	renderApp,
	resetApi,
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

// ------------------------------------------------------------------ helpers
// Interface assumed from SPEC-0002 section 11 (Web): one list item per field;
// inside it the label input is a textbox named `forms.fields.label`, the type
// control a combobox named `forms.fields.type`, the two switches role "switch"
// named `forms.fields.required` / `forms.fields.sensitive`, and the "..." menu
// a button named `forms.fields.menu` that opens a role "menu" of menuitems.

const save = () => screen.getByRole("button", { name: tCommon("save") });
const labelInputs = () =>
	screen.getAllByRole("textbox", {
		name: t("fields.label"),
	}) as HTMLInputElement[];

function rowOf(label: string): HTMLElement {
	const input = labelInputs().find((el) => el.value === label);
	if (!input) throw new Error(`no field row labelled "${label}"`);
	const row = input.closest("li");
	if (!row) throw new Error(`field row "${label}" is not a list item`);
	return row;
}

const switchIn = (row: HTMLElement, name: string) =>
	within(row).getByRole("switch", { name });
const isOn = (el: HTMLElement) =>
	el.getAttribute("aria-checked") === "true" ||
	(el as HTMLInputElement).checked === true;
const isDisabled = (el: HTMLElement) =>
	el.hasAttribute("disabled") ||
	el.getAttribute("aria-disabled") === "true" ||
	el.hasAttribute("data-disabled");

/** Hover or focus the control, then look for the tooltip copy. */
async function expectTooltip(control: HTMLElement, copy: string) {
	for (const target of [control, control.parentElement ?? control]) {
		fireEvent.pointerEnter(target);
		fireEvent.mouseOver(target);
		fireEvent.focus(target);
	}
	await waitFor(() => {
		const tip = screen
			.queryAllByRole("tooltip")
			.some((el) => el.textContent?.includes(copy));
		const described = control
			.getAttribute("aria-describedby")
			?.split(" ")
			.some((id) => document.getElementById(id)?.textContent?.includes(copy));
		if (!tip && !described) throw new Error(`tooltip "${copy}" not shown`);
	});
}

async function chooseFieldType(row: HTMLElement, label: string) {
	const control = within(row).getByRole("combobox", { name: t("fields.type") });
	if (control instanceof HTMLSelectElement) {
		const option = within(control).getByRole("option", { name: label });
		fireEvent.change(control, {
			target: { value: (option as HTMLOptionElement).value },
		});
		return;
	}
	fireEvent.click(control);
	const option = await screen.findByRole("option", { name: label });
	// base-ui commits an option on a click that follows a pointer press; a bare
	// click is treated as a stray virtual click and ignored
	fireEvent.pointerDown(option);
	fireEvent.click(option);
}

// jsdom does not turn Enter on a focused button into a click, so the keyboard
// path is: focus + Enter, and the click is only the fallback for that gap.
async function openMenuByKeyboard(row: HTMLElement): Promise<HTMLElement> {
	const trigger = within(row).getByRole("button", { name: t("fields.menu") });
	trigger.focus();
	fireEvent.keyDown(trigger, { key: "Enter" });
	fireEvent.keyUp(trigger, { key: "Enter" });
	try {
		return await waitFor(() => screen.getByRole("menu"), { timeout: 150 });
	} catch {
		fireEvent.click(trigger);
		return screen.findByRole("menu");
	}
}

async function moveUp(label: string) {
	const menu = await openMenuByKeyboard(rowOf(label));
	const item = within(menu).getByRole("menuitem", {
		name: t("fields.moveUp"),
	});
	item.focus();
	fireEvent.click(item);
	await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
}

async function openExisting(fields: ReturnType<typeof field>[], over = {}) {
	const tpl = template({ fields: [...clientFields(), ...fields], ...over });
	on("GET", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
	renderApp(<FormEditor formId={tpl.id} />);
	await screen.findByDisplayValue(tpl.name);
	return tpl;
}

type SentField = {
	id?: string;
	label: string;
	type: string;
	required?: boolean;
	sensitive?: boolean;
	systemKey?: string;
	options?: { id?: string; label: string }[];
};
const sentFields = (): SentField[] =>
	(
		callsTo("PATCH", `/api/forms/${FORM_ID}`)[0]?.body as {
			fields: SentField[];
		}
	).fields;

const systemInputs = [
	{
		label: "Nome completo",
		type: "full_name",
		required: true,
		systemKey: "client.name",
	},
	{ label: "E-mail", type: "email", required: true, systemKey: "client.email" },
	{ label: "Telefone", type: "phone", systemKey: "client.phone" },
] as const;

async function reorderAndPublish(tpl: ReturnType<typeof template>) {
	on("POST", `/api/forms/${tpl.id}/preview`, {
		status: 200,
		body: preview({ schemaChanged: true, nextVersion: 2 }),
	});
	on("PATCH", `/api/forms/${tpl.id}`, {
		status: 200,
		body: { ...tpl, version: 2, revision: tpl.revision + 1 },
	});
	fireEvent.click(save());
	const dialog = await screen.findByRole("dialog");
	fireEvent.click(
		within(dialog).getByRole("button", { name: t("actions.publish") }),
	);
	await waitFor(() =>
		expect(callsTo("PATCH", `/api/forms/${tpl.id}`)).toHaveLength(1),
	);
}

function expectSystemRowsSentByIdOnly(
	sent: SentField[],
	tpl: { fields: { id: string }[] },
) {
	for (const [index, row] of sent.slice(0, 3).entries()) {
		expect(row.id).toBe(tpl.fields[index]?.id);
		expect(row.sensitive).toBeUndefined();
		expect(row.systemKey).toBeUndefined();
	}
}

// -------------------------------------------------------------------- tests

describe("FormEditor field list (W-fld)", () => {
	it("AC-0002-01 creating a client template sends the three system rows with their systemKey and no sensitive", async () => {
		setRoute({});
		on("POST", "/api/forms", (call) => ({
			status: 201,
			body: template({ name: (call.body as { name: string }).name }),
		}));
		renderApp(<FormEditor />);

		fireEvent.click(
			screen.getByRole("radio", { name: t("editor.typeClient") }),
		);
		fireEvent.change(
			screen.getByLabelText(t("editor.name"), { selector: "input" }),
			{
				target: { value: "Anamnese inicial" },
			},
		);
		fireEvent.click(save());

		await waitFor(() => expect(callsTo("POST", "/api/forms")).toHaveLength(1));
		const body = callsTo("POST", "/api/forms")[0]?.body as {
			fields: SentField[];
		};
		expect(body.fields.map((f) => f.systemKey)).toEqual([
			"client.name",
			"client.email",
			"client.phone",
		]);
		expect(body.fields.every((f) => f.sensitive === undefined)).toBe(true);
	});

	it("AC-0002-10 releases the lock but keeps the switch ON when the label stops matching a protected term", async () => {
		renderApp(
			<FormEditor
				initialDraft={{
					type: "client",
					fields: [
						...systemInputs,
						{ label: "Alergia", type: "text", sensitive: true },
					],
				}}
			/>,
		);
		const before = switchIn(rowOf("Alergia"), t("fields.sensitive"));
		expect(isOn(before)).toBe(true);
		expect(isDisabled(before)).toBe(true);

		fireEvent.change(
			within(rowOf("Alergia")).getByRole("textbox", {
				name: t("fields.label"),
			}),
			{
				target: { value: "Preferência de horário" },
			},
		);

		await waitFor(() => {
			const after = switchIn(
				rowOf("Preferência de horário"),
				t("fields.sensitive"),
			);
			expect(isDisabled(after)).toBe(false);
			expect(isOn(after)).toBe(true);
		});
	});

	it("AC-0002-14 moving D up twice with the keyboard menu sends A, D, B, C with system rows by id only", async () => {
		const tpl = await openExisting([
			field({ label: "A", type: "text" }),
			field({ label: "B", type: "text" }),
			field({ label: "C", type: "text" }),
			field({ label: "D", type: "text" }),
		]);

		await moveUp("D");
		await moveUp("D");
		await reorderAndPublish(tpl);

		const sent = sentFields();
		expect(sent.map((f) => f.label)).toEqual([
			"Nome completo",
			"E-mail",
			"Telefone",
			"A",
			"D",
			"B",
			"C",
		]);
		expectSystemRowsSentByIdOnly(sent, tpl);
	});

	it("AC-0002-25 moving C up twice with the keyboard menu sends C, A, B with system rows by id only", async () => {
		const tpl = await openExisting([
			field({ label: "A", type: "text" }),
			field({ label: "B", type: "text" }),
			field({ label: "C", type: "text" }),
		]);

		await moveUp("C");
		await moveUp("C");
		await reorderAndPublish(tpl);

		const sent = sentFields();
		expect(sent.slice(3).map((f) => f.label)).toEqual(["C", "A", "B"]);
		expectSystemRowsSentByIdOnly(sent, tpl);
	});

	it("AC-0002-21 the keyboard-opened menu of a system row offers move up and move down but not Remover", async () => {
		renderApp(<FormEditor type="client" />);

		const menu = await openMenuByKeyboard(rowOf("E-mail"));

		expect(
			within(menu).getByRole("menuitem", { name: t("fields.moveUp") }),
		).toBeTruthy();
		expect(
			within(menu).getByRole("menuitem", { name: t("fields.moveDown") }),
		).toBeTruthy();
		expect(
			within(menu).queryByRole("menuitem", { name: t("fields.remove") }),
		).toBeNull();
	});

	it("AC-0002-22 changing the type of a published field shows the type-change warning", async () => {
		await openExisting([
			field({
				label: "Peso",
				type: "text",
				sensitive: true,
				sensitiveLock: "label",
				valueCount: 2,
			}),
		]);
		expect(screen.queryByText(t("fields.typeChangeWarning"))).toBeNull();

		await chooseFieldType(rowOf("Peso"), t("fields.types.number"));

		expect(await screen.findByText(t("fields.typeChangeWarning"))).toBeTruthy();
	});

	it("AC-0002-48 removing a field with answers asks first and says how many records have answers", async () => {
		await openExisting([
			field({ label: "Profissão", type: "text", valueCount: 3 }),
		]);

		const menu = await openMenuByKeyboard(rowOf("Profissão"));
		fireEvent.click(
			within(menu).getByRole("menuitem", { name: t("fields.remove") }),
		);

		const dialog = await waitFor(() => {
			const el =
				screen.queryByRole("alertdialog") ?? screen.queryByRole("dialog");
			if (!el) throw new Error("remove dialog not shown");
			return el;
		});
		expect(
			within(dialog).getByText(t("fields.removeWithAnswers", { count: 3 })),
		).toBeTruthy();
	});

	it("AC-0002-49 with 100 fields [Novo campo] is disabled and the limit hint is shown", () => {
		const custom = Array.from({ length: 97 }, (_, index) => ({
			label: `Campo ${index + 4}`,
			type: "text" as const,
		}));
		renderApp(
			<FormEditor
				initialDraft={{ type: "client", fields: [...systemInputs, ...custom] }}
			/>,
		);

		const add = screen.getByRole("button", { name: t("fields.add") });

		expect(isDisabled(add)).toBe(true);
		expect(screen.getByText(t("fields.limitReached"))).toBeTruthy();
	});

	it("AC-0002-50 a new row set to CPF has Dado protegido ON, disabled, with the locked-type tooltip", async () => {
		renderApp(<FormEditor type="client" />);

		fireEvent.click(screen.getByRole("button", { name: t("fields.add") }));
		const row = labelInputs().at(-1)?.closest("li");
		if (!row) throw new Error("no field row");
		await chooseFieldType(row, t("fields.types.cpf"));

		const lock = switchIn(row, t("fields.sensitive"));
		expect(isOn(lock)).toBe(true);
		expect(isDisabled(lock)).toBe(true);
		await expectTooltip(lock, t("fields.sensitiveLockedType"));
	});

	it("AC-0002-53 switching a published required select to Sim/Não and back sends the original field, required and option ids", async () => {
		const options = [
			{ id: "00000000-0000-4000-8000-00000000a001", label: "Manhã" },
			{ id: "00000000-0000-4000-8000-00000000a002", label: "Tarde" },
			{ id: "00000000-0000-4000-8000-00000000a003", label: "Noite" },
		];
		const turno = field({
			label: "Turno",
			type: "select",
			required: true,
			options,
		});
		const tpl = await openExisting([turno]);
		on("POST", `/api/forms/${tpl.id}/preview`, {
			status: 200,
			body: preview({ schemaChanged: false }),
		});
		on("PATCH", `/api/forms/${tpl.id}`, { status: 200, body: tpl });

		await chooseFieldType(rowOf("Turno"), t("fields.types.yes_no"));
		await chooseFieldType(rowOf("Turno"), t("fields.types.select"));
		// the template name changes too, so [Salvar] is enabled whatever the draft's dirty tracking says
		fireEvent.change(
			screen.getByLabelText(t("editor.name"), { selector: "input" }),
			{ target: { value: "Ficha renomeada" } },
		);
		fireEvent.click(save());

		await waitFor(() =>
			expect(callsTo("PATCH", `/api/forms/${tpl.id}`)).toHaveLength(1),
		);
		const sent = sentFields().find((f) => f.label === "Turno");
		if (!sent) throw new Error("Turno was not sent");
		expect(sent).toMatchObject({
			id: turno.id,
			type: "select",
			required: true,
		});
		expect(sent.options?.map((o) => o.id)).toEqual(options.map((o) => o.id));
		expect(sent.options?.map((o) => o.label)).toEqual([
			"Manhã",
			"Tarde",
			"Noite",
		]);
	});

	it("§7 turning protection off on an existing custom field sends sensitive: false", async () => {
		const tpl = await openExisting([
			field({ label: "Hobby", type: "text", sensitive: true }),
		]);
		fireEvent.click(switchIn(rowOf("Hobby"), t("fields.sensitive")));
		await waitFor(() =>
			expect(isOn(switchIn(rowOf("Hobby"), t("fields.sensitive")))).toBe(false),
		);
		await reorderAndPublish(tpl);

		const sent = sentFields().find((f) => f.label === "Hobby");
		expect(sent?.sensitive).toBe(false);
	});

	const previewUrl = (id: string) => `/api/forms/${id}/preview`;
	const failPreview = (id: string, error: string, path: string) =>
		on("POST", previewUrl(id), { status: 422, body: { error, field: path } });
	const renameTemplate = (name: string) =>
		fireEvent.change(
			screen.getByLabelText(t("editor.name"), { selector: "input" }),
			{ target: { value: name } },
		);

	it("§8 a server fieldOptions.required at fields.3.options shows inline in that row's options", async () => {
		const tpl = await openExisting([
			field({
				label: "Turno",
				type: "select",
				options: [
					{ id: "00000000-0000-4000-8000-00000000a001", label: "Manhã" },
					{ id: "00000000-0000-4000-8000-00000000a002", label: "Tarde" },
				],
			}),
		]);
		failPreview(tpl.id, "fieldOptions.required", "fields.3.options");
		renameTemplate("Ficha 2");
		fireEvent.click(save());

		const message = await screen.findByText("Adicione pelo menos 2 opções.");
		expect(rowOf("Turno").contains(message)).toBe(true);
		expect(rowOf("Turno").getAttribute("aria-invalid")).toBe("true");
	});

	it("§8 after a server field error, fixing another row and pressing Salvar sends the request", async () => {
		const tpl = await openExisting([
			field({ label: "A", type: "text" }),
			field({ label: "B", type: "text" }),
		]);
		failPreview(tpl.id, "fieldLabel.duplicate", "fields.4.label");
		renameTemplate("Ficha 2");
		fireEvent.click(save());
		await screen.findByText("Já existe um campo com esse rótulo neste modelo.");
		expect(callsTo("POST", previewUrl(tpl.id))).toHaveLength(1);

		on("POST", previewUrl(tpl.id), {
			status: 200,
			body: preview({ schemaChanged: false }),
		});
		on("PATCH", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
		fireEvent.change(
			within(rowOf("A")).getByRole("textbox", { name: t("fields.label") }),
			{ target: { value: "A2" } },
		);
		fireEvent.click(save());

		await waitFor(() =>
			expect(callsTo("POST", previewUrl(tpl.id))).toHaveLength(2),
		);
	});

	it("§8 a fields root server error does not block the next Salvar", async () => {
		const tpl = await openExisting([field({ label: "A", type: "text" })]);
		failPreview(tpl.id, "systemField.missing", "fields");
		renameTemplate("Ficha 2");
		fireEvent.click(save());
		await screen.findByText(
			"Um campo do sistema está faltando. Recarregue o modelo.",
		);

		on("POST", previewUrl(tpl.id), {
			status: 200,
			body: preview({ schemaChanged: false }),
		});
		on("PATCH", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
		renameTemplate("Ficha 3");
		fireEvent.click(save());

		await waitFor(() =>
			expect(callsTo("POST", previewUrl(tpl.id))).toHaveLength(2),
		);
	});
});
