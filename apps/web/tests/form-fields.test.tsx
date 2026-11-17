// W-fld: SPEC-0002 AC-0002-01, -10, -14, -21, -22, -25, -48, -49, -50, -53 to -67,
// -69, -70 (field cards and settings panel inside SPEC-0001's editor; network
// faked by forms-harness).
import {
	act,
	cleanup,
	createEvent,
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
	restoreScreen,
	setRoute,
	setScreen,
	stubFetch,
	t,
	tCommon,
	template,
	tValidation,
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

const restores: (() => void)[] = [];

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({ formId: FORM_ID });
	vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	for (const restore of restores.splice(0)) restore();
	restoreScreen();
	vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ helpers
// Interface assumed from SPEC-0002 section 4.6 and 11 (Web): each field is an
// <li> card named by its label (type name while the label is empty), covered by
// a button of the same name: the idle card's tab stop (tabIndex 0) and its
// click target. The selected card has aria-current="true". On a
// wide screen the selected card holds a textbox named `forms.fields.label` and
// a button named `forms.fields.menu` that opens the settings panel, a dialog
// named `forms.fields.panelTitle` holding the switches, the type combobox, the
// "Mover" menu button and "Remover".

const save = () => screen.getByRole("button", { name: tCommon("save") });

/** The field cards: outermost list items, minus toasts, dialogs and menus. */
function cards(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>("li")).filter(
		(li) =>
			!li.parentElement?.closest("li") &&
			!li.closest("[data-sonner-toaster]") &&
			!li.closest('[role="dialog"],[role="menu"]'),
	);
}

const labelTextbox = (card: HTMLElement) =>
	within(card).queryByRole("textbox", {
		name: t("fields.label"),
	}) as HTMLInputElement | null;

const cardLabel = (card: HTMLElement) =>
	labelTextbox(card)?.value ?? card.getAttribute("aria-label") ?? "";

function cardOf(label: string): HTMLElement {
	const card = cards().find(
		(el) =>
			el.getAttribute("aria-label") === label ||
			labelTextbox(el)?.value === label ||
			(el.getAttribute("aria-current") === "true" &&
				within(el).queryByText(label) !== null),
	);
	if (!card) throw new Error(`no field card labelled "${label}"`);
	return card;
}

/** The button that covers a card: its tab stop and the target of a click or tap. */
const coverButton = (card: HTMLElement) =>
	within(card).getByRole("button", {
		name: card.getAttribute("aria-label") ?? "",
	});

/** A card that is not selected is named by its label and reachable with Tab. */
function idleCard(label: string): HTMLElement {
	const card = cardOf(label);
	expect(card.getAttribute("aria-label")).toBe(label);
	expect(coverButton(card).getAttribute("tabindex")).toBe("0");
	return card;
}

/** Moving focus into a card selects it. */
function selectCard(card: HTMLElement): HTMLElement {
	if (card.getAttribute("aria-current") !== "true") {
		act(() => card.focus());
	}
	return card;
}

const settingsButton = (card: HTMLElement) =>
	within(card).getByRole("button", { name: t("fields.menu") });
const panelOrNull = () =>
	screen.queryByRole("dialog", { name: t("fields.panelTitle") });
const panel = () =>
	screen.getByRole("dialog", { name: t("fields.panelTitle") });

async function openSettings(card: HTMLElement): Promise<HTMLElement> {
	selectCard(card);
	const trigger = settingsButton(card);
	if (trigger.getAttribute("aria-expanded") !== "true") {
		fireEvent.click(trigger);
	}
	return screen.findByRole("dialog", { name: t("fields.panelTitle") });
}

// jsdom does not turn Enter on a focused button into a click, so the keyboard
// path is: focus + Enter, and the click is only the fallback for that gap.
async function openSettingsByKeyboard(card: HTMLElement): Promise<HTMLElement> {
	selectCard(card);
	const trigger = settingsButton(card);
	if (trigger.getAttribute("aria-expanded") === "true") return panel();
	trigger.focus();
	fireEvent.keyDown(trigger, { key: "Enter" });
	fireEvent.keyUp(trigger, { key: "Enter" });
	try {
		return await waitFor(() => panel(), { timeout: 150 });
	} catch {
		fireEvent.click(trigger);
		return screen.findByRole("dialog", { name: t("fields.panelTitle") });
	}
}

async function switchIn(card: HTMLElement, name: string) {
	return within(await openSettings(card)).getByRole("switch", { name });
}

/** The label textbox of a card; a card that is not selected is selected first. */
function labelInput(label: string): HTMLInputElement {
	const card = selectCard(cardOf(label));
	const input = labelTextbox(card);
	if (!input) throw new Error(`card "${label}" has no label textbox`);
	return input;
}

const isOn = (el: HTMLElement) =>
	el.getAttribute("aria-checked") === "true" ||
	(el as HTMLInputElement).checked === true;
const isDisabled = (el: HTMLElement) =>
	el.hasAttribute("disabled") ||
	el.getAttribute("aria-disabled") === "true" ||
	el.hasAttribute("data-disabled");

const shownType = (control: HTMLElement) =>
	control instanceof HTMLSelectElement
		? (control.selectedOptions[0]?.text ?? "")
		: (control.textContent ?? "");

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

async function chooseFieldType(card: HTMLElement, label: string) {
	const dialog = await openSettings(card);
	const control = within(dialog).getByRole("combobox", {
		name: t("fields.type"),
	});
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

async function moveUp(label: string) {
	const dialog = await openSettingsByKeyboard(cardOf(label));
	const trigger = within(dialog).getByRole("button", {
		name: t("fields.move"),
	});
	trigger.focus();
	fireEvent.keyDown(trigger, { key: "Enter" });
	fireEvent.keyUp(trigger, { key: "Enter" });
	let menu: HTMLElement;
	try {
		menu = await waitFor(() => screen.getByRole("menu"), { timeout: 150 });
	} catch {
		fireEvent.click(trigger);
		menu = await screen.findByRole("menu");
	}
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
	helpText?: string | null;
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
	// the settings panel is a dialog too: ask for the publish dialog by name
	const dialog = await screen.findByRole("dialog", {
		name: t("publish.confirm", { version: 2 }),
	});
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

const previewUrl = (id: string) => `/api/forms/${id}/preview`;
const failPreview = (id: string, error: string, path: string) =>
	on("POST", previewUrl(id), { status: 422, body: { error, field: path } });
const renameTemplate = (name: string) =>
	fireEvent.change(
		screen.getByLabelText(t("editor.name"), { selector: "input" }),
		{ target: { value: name } },
	);

// ----------------------------------------------------------- pointer helpers

type PointerKind = "mouse" | "touch" | "pen";
function pointer(
	type: "pointerDown" | "pointerMove" | "pointerUp",
	target: HTMLElement,
	pointerType: PointerKind,
	clientY: number,
) {
	fireEvent[type](target, {
		pointerId: 1,
		isPrimary: true,
		pointerType,
		button: 0,
		buttons: type === "pointerUp" ? 0 : 1,
		clientX: 50,
		clientY,
	});
	// a browser sends touch events alongside the pointer events of a touch
	if (pointerType === "touch") touch(TOUCH_EVENT[type], target, clientY);
}

const TOUCH_EVENT = {
	pointerDown: "touchStart",
	pointerMove: "touchMove",
	pointerUp: "touchEnd",
} as const;
function touch(
	type: "touchStart" | "touchMove" | "touchEnd",
	target: HTMLElement,
	clientY: number,
) {
	const point = { identifier: 1, target, clientX: 50, clientY };
	const touches = type === "touchEnd" ? [] : [point];
	const event = createEvent[type](target);
	Object.defineProperties(event, {
		touches: { value: touches },
		targetTouches: { value: touches },
		changedTouches: { value: [point] },
	});
	fireEvent(target, event);
}

/** dnd-kit ignores clicks for 50 ms after a drop; no person clicks that fast. */
const afterDrop = () =>
	act(() => new Promise<void>((resolve) => setTimeout(resolve, 60)));

/** Card `index` occupies y in [index * 100, index * 100 + 100) wherever it sits in the DOM. */
function stubCardLayout() {
	const real = Element.prototype.getBoundingClientRect;
	const spy = vi
		.spyOn(Element.prototype, "getBoundingClientRect")
		.mockImplementation(function (this: Element) {
			const index = cards().indexOf(this as HTMLElement);
			if (index < 0) return real.call(this);
			const top = index * 100;
			return {
				x: 0,
				y: top,
				top,
				left: 0,
				right: 300,
				bottom: top + 100,
				width: 300,
				height: 100,
				toJSON: () => ({}),
			};
		});
	restores.push(() => spy.mockRestore());
}
const centerOf = (index: number) => index * 100 + 50;

/** A tap: press and release without moving, then the click the browser sends. */
function tapCard(card: HTMLElement) {
	const target = coverButton(card);
	pointer("pointerDown", target, "touch", 50);
	pointer("pointerUp", target, "touch", 50);
	fireEvent.click(target);
}

const customLabels = () => cards().map(cardLabel).slice(3);

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
		const before = await switchIn(cardOf("Alergia"), t("fields.sensitive"));
		expect(isOn(before)).toBe(true);
		expect(isDisabled(before)).toBe(true);

		fireEvent.change(labelInput("Alergia"), {
			target: { value: "Preferência de horário" },
		});

		await waitFor(() => {
			const after = within(panel()).getByRole("switch", {
				name: t("fields.sensitive"),
			});
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

	it("AC-0002-21 tabbing to an idle system card and opening Mover by keyboard offers move up and move down, no Remover", async () => {
		renderApp(<FormEditor type="client" />);
		const card = idleCard("E-mail");
		expect(card.getAttribute("aria-current")).toBeNull();

		// Tab onto the idle card, then keys only: no click fallback
		act(() => card.focus());
		const trigger = settingsButton(card);
		act(() => trigger.focus());
		fireEvent.keyDown(trigger, { key: "Enter" });
		fireEvent.keyUp(trigger, { key: "Enter" });
		const dialog = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});

		const move = within(dialog).getByRole("button", { name: t("fields.move") });
		act(() => move.focus());
		fireEvent.keyDown(move, { key: "Enter" });
		fireEvent.keyUp(move, { key: "Enter" });
		const menu = await screen.findByRole("menu");

		expect(
			within(menu).getByRole("menuitem", { name: t("fields.moveUp") }),
		).toBeTruthy();
		expect(
			within(menu).getByRole("menuitem", { name: t("fields.moveDown") }),
		).toBeTruthy();
		expect(
			within(dialog).queryByRole("button", { name: t("fields.remove") }),
		).toBeNull();
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

		await chooseFieldType(cardOf("Peso"), t("fields.types.number"));

		expect(await screen.findByText(t("fields.typeChangeWarning"))).toBeTruthy();
	});

	it("AC-0002-48 removing a field with answers asks first and says how many records have answers", async () => {
		await openExisting([
			field({ label: "Profissão", type: "text", valueCount: 3 }),
		]);

		const settings = await openSettingsByKeyboard(cardOf("Profissão"));
		fireEvent.click(
			within(settings).getByRole("button", { name: t("fields.remove") }),
		);

		const dialog = await waitFor(() => {
			const el =
				screen.queryByRole("alertdialog", {
					name: t("fields.removeConfirm"),
				}) ?? screen.queryByRole("dialog", { name: t("fields.removeConfirm") });
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
		const card = cards().at(-1);
		if (!card) throw new Error("no field card");
		await chooseFieldType(card, t("fields.types.cpf"));

		const lock = await switchIn(card, t("fields.sensitive"));
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

		await chooseFieldType(cardOf("Turno"), t("fields.types.yes_no"));
		await chooseFieldType(cardOf("Turno"), t("fields.types.select"));
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
		fireEvent.click(await switchIn(cardOf("Hobby"), t("fields.sensitive")));
		await waitFor(() =>
			expect(
				isOn(
					within(panel()).getByRole("switch", { name: t("fields.sensitive") }),
				),
			).toBe(false),
		);
		await reorderAndPublish(tpl);

		const sent = sentFields().find((f) => f.label === "Hobby");
		expect(sent?.sensitive).toBe(false);
	});

	it("§8 a server fieldOptions.required at fields.3.options shows inline in that card's options", async () => {
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
		expect(cardOf("Turno").contains(message)).toBe(true);
		expect(cardOf("Turno").getAttribute("aria-invalid")).toBe("true");
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
		fireEvent.change(labelInput("A"), { target: { value: "A2" } });
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

	it("AC-0002-54 Novo campo on a wide screen selects the new card, opens its panel, help text ON, focus on its label", async () => {
		renderApp(<FormEditor type="client" />);
		const before = cards().length;

		fireEvent.click(screen.getByRole("button", { name: t("fields.add") }));

		const all = cards();
		expect(all).toHaveLength(before + 1);
		const card = all.at(-1) as HTMLElement;
		expect(card.getAttribute("aria-current")).toBe("true");
		const dialog = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		expect(
			shownType(
				within(dialog).getByRole("combobox", { name: t("fields.type") }),
			),
		).toContain(t("fields.types.text"));
		expect(
			isOn(within(dialog).getByRole("switch", { name: t("fields.helpText") })),
		).toBe(true);
		const description = within(card).getByRole("textbox", {
			name: t("fields.helpText"),
		}) as HTMLInputElement;
		expect(description.value).toBe("");
		expect(description.getAttribute("placeholder")).toBe(
			t("fields.descriptionPlaceholder"),
		);
		const label = within(card).getByRole("textbox", {
			name: t("fields.label"),
		});
		await waitFor(() => expect(document.activeElement).toBe(label));
	});

	it("AC-0002-55 Novo campo on a narrow screen opens the sheet with focus on its label input", async () => {
		setScreen("narrow");
		renderApp(<FormEditor type="client" />);

		fireEvent.click(screen.getByRole("button", { name: t("fields.add") }));

		const sheet = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		const label = within(sheet).getByRole("textbox", {
			name: t("fields.label"),
		});
		// the first stop of Tab inside the sheet, not only the first textbox
		const tabbable = Array.from(
			sheet.querySelectorAll<HTMLElement>(
				"input, button, select, textarea, a[href], [tabindex]",
			),
		).filter(
			(el) =>
				el.tabIndex >= 0 &&
				!el.hasAttribute("disabled") &&
				!el.hasAttribute("data-base-ui-focus-guard") &&
				!el.closest('[aria-hidden="true"]'),
		);
		expect(tabbable[0]).toBe(label);
		const required = within(sheet).getByRole("switch", {
			name: t("fields.required"),
		});
		expect(
			label.compareDocumentPosition(required) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(label));
	});

	it("AC-0002-56 turning help text OFF on a published field sends helpText null", async () => {
		const objetivo = field({
			label: "Objetivo",
			type: "text",
			helpText: "Conte o que você espera",
		});
		const tpl = await openExisting([objetivo]);

		const dialog = await openSettings(cardOf("Objetivo"));
		const help = within(dialog).getByRole("switch", {
			name: t("fields.helpText"),
		});
		expect(isOn(help)).toBe(true);
		fireEvent.click(help);
		await waitFor(() =>
			expect(
				isOn(
					within(panel()).getByRole("switch", { name: t("fields.helpText") }),
				),
			).toBe(false),
		);
		await reorderAndPublish(tpl);

		const sent = sentFields().find((f) => f.label === "Objetivo");
		expect(sent?.id).toBe(objetivo.id);
		expect(sent?.helpText).toBeNull();
	});

	it("AC-0002-57 a published field without help text opens with help text OFF and no description input", async () => {
		await openExisting([field({ label: "Profissão", type: "text" })]);
		const card = idleCard("Profissão");

		const dialog = await openSettings(card);

		expect(
			isOn(within(dialog).getByRole("switch", { name: t("fields.helpText") })),
		).toBe(false);
		expect(
			within(card).queryByRole("textbox", { name: t("fields.helpText") }),
		).toBeNull();
		expect(
			within(card).queryByPlaceholderText(t("fields.descriptionPlaceholder")),
		).toBeNull();
	});

	it("AC-0002-58 clicking another card selects it and closes the open panel", async () => {
		await openExisting([
			field({ label: "Profissão", type: "text" }),
			field({ label: "Objetivo", type: "text" }),
		]);
		await openSettings(cardOf("Profissão"));
		const objetivo = idleCard("Objetivo");

		pointer("pointerDown", objetivo, "mouse", 50);
		fireEvent.mouseDown(objetivo);
		act(() => objetivo.focus());
		pointer("pointerUp", objetivo, "mouse", 50);
		fireEvent.mouseUp(objetivo);
		fireEvent.click(objetivo);

		await waitFor(() => expect(panelOrNull()).toBeNull());
		expect(cardOf("Objetivo").getAttribute("aria-current")).toBe("true");
		expect(idleCard("Profissão").getAttribute("aria-current")).toBeNull();
	});

	it("AC-0002-59 the ⋯ button opens Configurações do campo with its six items in order", async () => {
		await openExisting([field({ label: "Objetivo", type: "text" })]);
		const card = selectCard(cardOf("Objetivo"));
		expect(panelOrNull()).toBeNull();
		const trigger = settingsButton(card);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");

		fireEvent.click(trigger);

		const dialog = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const items = [
			within(dialog).getByRole("switch", { name: t("fields.required") }),
			within(dialog).getByRole("switch", { name: t("fields.helpText") }),
			within(dialog).getByRole("switch", { name: t("fields.sensitive") }),
			within(dialog).getByRole("combobox", { name: t("fields.type") }),
			within(dialog).getByRole("button", { name: t("fields.move") }),
			within(dialog).getByRole("button", { name: t("fields.remove") }),
		];
		for (const [index, item] of items.slice(1).entries()) {
			expect(
				(items[index] as HTMLElement).compareDocumentPosition(item) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
	});

	it("AC-0002-60 Escape from a panel control closes the panel and returns focus to ⋯", async () => {
		await openExisting([field({ label: "Objetivo", type: "text" })]);
		const card = cardOf("Objetivo");
		const dialog = await openSettings(card);
		const control = within(dialog).getByRole("switch", {
			name: t("fields.required"),
		});
		act(() => control.focus());

		fireEvent.keyDown(control, { key: "Escape" });
		fireEvent.keyUp(control, { key: "Escape" });

		await waitFor(() => expect(panelOrNull()).toBeNull());
		expect(document.activeElement).toBe(settingsButton(cardOf("Objetivo")));
	});

	const abc = () => [
		field({ label: "A", type: "text" }),
		field({ label: "B", type: "text" }),
		field({ label: "C", type: "text" }),
	];

	it("AC-0002-61 dragging card C above A with the mouse and publishing sends C, A, B", async () => {
		const tpl = await openExisting(abc());
		stubCardLayout();
		const c = idleCard("C");

		pointer("pointerDown", c, "mouse", centerOf(5));
		pointer("pointerMove", c, "mouse", centerOf(5) - 10);
		pointer("pointerMove", c, "mouse", centerOf(3));
		pointer("pointerUp", c, "mouse", centerOf(3));
		await afterDrop();
		await reorderAndPublish(tpl);

		const sent = sentFields();
		expect(sent.slice(3).map((f) => f.label)).toEqual(["C", "A", "B"]);
		expectSystemRowsSentByIdOnly(sent, tpl);
	});

	it("§4.4 a mouse drag neither selects nor focuses the dragged card", async () => {
		await openExisting(abc());
		stubCardLayout();
		const cover = coverButton(idleCard("C"));

		pointer("pointerDown", cover, "mouse", centerOf(5));
		// a browser focuses the pressed button unless mousedown is cancelled
		if (fireEvent.mouseDown(cover)) act(() => cover.focus());
		pointer("pointerMove", cover, "mouse", centerOf(5) - 10);
		pointer("pointerMove", cover, "mouse", centerOf(3));
		pointer("pointerUp", cover, "mouse", centerOf(3));
		fireEvent.mouseUp(cover);
		fireEvent.click(cover);
		await afterDrop();

		expect(customLabels()).toEqual(["C", "A", "B"]);
		expect(cards().filter((card) => card.getAttribute("aria-current"))).toEqual(
			[],
		);
		expect(document.activeElement).toBe(document.body);
	});

	it("AC-0002-62 a mouse drag that starts in the label input does not move the card", async () => {
		await openExisting(abc());
		stubCardLayout();
		const input = labelInput("C");

		pointer("pointerDown", input, "mouse", centerOf(5));
		pointer("pointerMove", input, "mouse", centerOf(5) - 10);
		pointer("pointerMove", input, "mouse", centerOf(3));
		pointer("pointerUp", input, "mouse", centerOf(3));

		expect(cardOf("C").getAttribute("aria-current")).toBe("true");
		expect(customLabels()).toEqual(["A", "B", "C"]);
	});

	it("AC-0002-63 holding card C for 300 ms on touch, dragging above A and publishing sends C, A, B", async () => {
		const tpl = await openExisting(abc());
		stubCardLayout();
		const c = idleCard("C");

		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		pointer("pointerDown", c, "touch", centerOf(5));
		act(() => {
			vi.advanceTimersByTime(300);
		});
		pointer("pointerMove", c, "touch", centerOf(4));
		pointer("pointerMove", c, "touch", centerOf(3));
		pointer("pointerUp", c, "touch", centerOf(3));
		act(() => {
			vi.advanceTimersByTime(50);
		});
		vi.useRealTimers();
		await reorderAndPublish(tpl);

		const sent = sentFields();
		expect(sent.slice(3).map((f) => f.label)).toEqual(["C", "A", "B"]);
		expectSystemRowsSentByIdOnly(sent, tpl);
	});

	it("AC-0002-64 a touch that moves before 300 ms picks up no card", async () => {
		await openExisting(abc());
		stubCardLayout();
		const c = idleCard("C");

		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		pointer("pointerDown", c, "touch", centerOf(5));
		act(() => {
			vi.advanceTimersByTime(100);
		});
		pointer("pointerMove", c, "touch", centerOf(4));
		act(() => {
			vi.advanceTimersByTime(500);
		});
		pointer("pointerMove", c, "touch", centerOf(3));
		pointer("pointerUp", c, "touch", centerOf(3));
		vi.useRealTimers();

		expect(customLabels()).toEqual(["A", "B", "C"]);
	});

	it("AC-0002-65 a label error on an idle card selects it with the message and focus on its label input", async () => {
		await openExisting([
			field({ label: "Profissão", type: "text" }),
			field({ label: "Objetivo", type: "text" }),
		]);
		fireEvent.change(labelInput("Objetivo"), { target: { value: "" } });
		selectCard(cardOf("Profissão"));

		fireEvent.click(save());

		await waitFor(() =>
			expect(cards()[4]?.getAttribute("aria-current")).toBe("true"),
		);
		const card = cards()[4] as HTMLElement;
		const input = within(card).getByRole("textbox", {
			name: t("fields.label"),
		});
		expect(
			within(card).getByText(tValidation("fieldLabel.required")),
		).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(input));
		expect(cards()[3]?.getAttribute("aria-current")).toBeNull();
	});

	it("AC-0002-66 a label error on a narrow screen opens that card's sheet with focus on its label input", async () => {
		setScreen("narrow");
		await openExisting([
			field({ label: "Profissão", type: "text" }),
			field({ label: "Objetivo", type: "text" }),
		]);
		tapCard(idleCard("Objetivo"));
		const first = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		fireEvent.change(
			within(first).getByRole("textbox", { name: t("fields.label") }),
			{ target: { value: "" } },
		);
		fireEvent.click(
			within(first).getByRole("button", { name: t("fields.close") }),
		);
		await waitFor(() => expect(panelOrNull()).toBeNull());

		fireEvent.click(save());

		const sheet = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		const input = within(sheet).getByRole("textbox", {
			name: t("fields.label"),
		});
		expect(
			within(sheet).getByText(tValidation("fieldLabel.required")),
		).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(input));
	});

	it("AC-0002-67 a server fieldRequired.locked opens the card's panel with the message and focus on Obrigatório", async () => {
		const tpl = await openExisting([
			field({ label: "Aceita?", type: "yes_no" }),
		]);
		expect(idleCard("Aceita?").getAttribute("aria-current")).toBeNull();
		failPreview(tpl.id, "fieldRequired.locked", "fields.3.required");
		renameTemplate("Ficha 2");

		fireEvent.click(save());

		const dialog = await screen.findByRole("dialog", {
			name: t("fields.panelTitle"),
		});
		expect(cards()[3]?.getAttribute("aria-current")).toBe("true");
		const required = within(dialog).getByRole("switch", {
			name: t("fields.required"),
		});
		expect(
			within(dialog).getByText(tValidation("fieldRequired.locked")),
		).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(required));
	});

	it("AC-0002-69 tapping an idle card on a narrow screen selects it and opens its sheet", async () => {
		setScreen("narrow");
		await openExisting([field({ label: "Objetivo", type: "text" })]);
		const card = idleCard("Objetivo");

		tapCard(card);

		await screen.findByRole("dialog", { name: t("fields.panelTitle") });
		expect(cards()[3]?.getAttribute("aria-current")).toBe("true");
	});

	it("AC-0002-70 an error with no control on a narrow screen shows an error toast and focuses the card, no sheet", async () => {
		setScreen("narrow");
		const tpl = await openExisting([field({ label: "Obs", type: "text" })]);
		expect(idleCard("Obs").getAttribute("aria-current")).toBeNull();
		failPreview(tpl.id, "fieldOptions.not-allowed", "fields.3.options");
		renameTemplate("Ficha 2");

		fireEvent.click(save());

		const message = await screen.findByText(
			tValidation("fieldOptions.not-allowed"),
		);
		expect(
			message.closest("[data-sonner-toast]")?.getAttribute("data-type"),
		).toBe("error");
		const card = cards()[3] as HTMLElement;
		expect(card.getAttribute("aria-current")).toBe("true");
		await waitFor(() => expect(document.activeElement).toBe(card));
		expect(panelOrNull()).toBeNull();
	});
});
