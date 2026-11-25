// W-title: SPEC-0007 AC-0007-01 to -06, -09 to -14, -17, -18, -20, -21 and R6.
// The record's name is the page heading input. Run for `clients` and `services`:
// the services run is the service form of each criterion (SPEC-0007 section 10).
// Criteria that need the real name copy or the consent checkbox (AC-0007-07, -08,
// -15, -16, -19) live in clients-form.test.tsx and services-form.test.tsx.
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordForm } from "@/app/[lang]/(private)/orgs/[tenant]/_components/records/record-form";
import {
	describedText,
	ENTITIES,
	ENTITY,
	type Entity,
	entityTemplate,
	type FakeAdapter,
	FORM_ID,
	fakeAdapter,
	field,
	labelRe,
	navigatedTo,
	never,
	on,
	RECORD_ID,
	record,
	renderApp,
	resetApi,
	SYSTEM_ATTRIBUTES,
	serveTemplateOf,
	serveVersion,
	setRoute,
	stubFetch,
	systemFieldsOf,
	VALID_SYSTEM,
} from "./record-harness";

vi.mock("axios", async (importOriginal) => {
	const mod = await importOriginal<typeof import("axios")>();
	const harness = await import("./record-harness");
	harness.installAxiosAdapter(mod.default, mod.AxiosError);
	return mod;
});
vi.mock("@/i18n/navigation", async () =>
	(await import("./record-harness")).i18nNavigationMock(),
);
vi.mock("next/navigation", async () =>
	(await import("./record-harness")).nextNavigationMock(),
);

beforeEach(() => {
	resetApi();
	stubFetch();
	setRoute({});
	vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ helpers

const typeInto = (el: Element, value: string) =>
	fireEvent.change(el, { target: { value } });

/** The heading input: found by its placeholder, which is the name label. */
const titleInput = (label: string) =>
	screen.getByPlaceholderText(label) as HTMLInputElement;

const h1s = () => screen.queryAllByRole("heading", { level: 1 });

/** The accessible name of a form input: its aria-label or its <label>. */
function nameOf(el: HTMLInputElement): string {
	const raw =
		el.getAttribute("aria-label") ?? el.labels?.[0]?.textContent ?? "";
	return raw.replace(/\s*\*$/, "");
}

/** The names of the form's inputs that come after `anchor`, in page order. */
function inputNamesAfter(anchor: Element): string[] {
	const form = document.querySelector("form") as HTMLFormElement;
	return [...form.querySelectorAll("input")]
		.filter(
			(el) =>
				anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING &&
				el.type !== "checkbox",
		)
		.map(nameOf);
}

function render(
	h: FakeAdapter,
	props:
		| { mode: "create"; formId: string }
		| { mode: "edit"; recordId: string },
) {
	return renderApp(<RecordForm adapter={h.adapter} {...props} />);
}

async function openNew(entity: Entity, h: FakeAdapter) {
	render(h, { mode: "create", formId: FORM_ID });
	await screen.findByText(
		ENTITY[entity].tr("form.subtitle", { name: "Ficha" }),
	);
}

async function openEdit(
	entity: Entity,
	h: FakeAdapter,
	rec: ReturnType<typeof record>,
	fields = systemFieldsOf(entity),
) {
	serveVersion(rec.form.version, fields);
	h.state.read = async () => ({ ok: true, record: rec });
	render(h, { mode: "edit", recordId: RECORD_ID });
	await screen.findByText(
		ENTITY[entity].tr("form.subtitle", { name: rec.form.name }),
	);
}

// ------------------------------------------------------------------- tests

describe.each(ENTITIES)("W-title (%s)", (entity) => {
	const tr = ENTITY[entity].tr;
	const sysLabels = ENTITY[entity].systemLabels;
	const nameLabel = sysLabels[0];
	const others = sysLabels.slice(1);
	const newTitle = tr("form.newTitle");
	const subtitle = () =>
		screen.getByText(tr("form.subtitle", { name: "Ficha" }));
	let h: FakeAdapter;
	beforeEach(() => {
		h = fakeAdapter(entity);
	});

	it("AC-0007-01 the heading input comes first, above the subtitle, empty, named and placeholdered by the name label, required, with no *", async () => {
		serveTemplateOf(entityTemplate(entity, []));

		await openNew(entity, h);

		const el = titleInput(nameLabel);
		expect(el.value).toBe("");
		expect(screen.getByRole("textbox", { name: nameLabel })).toBe(el);
		expect(el.getAttribute("aria-label")).toBe(nameLabel);
		expect(el.getAttribute("placeholder")).toBe(nameLabel);
		expect(el.getAttribute("aria-required")).toBe("true");
		expect(el.labels?.length ?? 0).toBe(0);
		// first input of the page, above the subtitle
		expect(document.querySelector("form input")).toBe(el);
		expect(
			el.compareDocumentPosition(subtitle()) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("AC-0007-02 the field inputs follow the subtitle in version order and the name is not repeated", async () => {
		const profissao = field({ label: "Profissão", type: "text" });
		serveTemplateOf(entityTemplate(entity, [profissao]));

		await openNew(entity, h);

		expect(inputNamesAfter(subtitle())).toEqual([...others, "Profissão"]);
		expect(screen.getAllByLabelText(labelRe(nameLabel))).toHaveLength(1);
		expect(
			titleInput(nameLabel).compareDocumentPosition(subtitle()) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("AC-0007-03 the hidden level-1 heading reads the new-record title, then the typed name", async () => {
		serveTemplateOf(entityTemplate(entity, []));
		await openNew(entity, h);
		expect(h1s().map((e) => e.textContent)).toEqual([newTitle]);

		typeInto(titleInput(nameLabel), "Ana Souza");

		expect(h1s().map((e) => e.textContent)).toEqual(["Ana Souza"]);
	});

	it("AC-0007-05 a renamed name label names the heading input and is its placeholder", async () => {
		const [name, ...rest] = systemFieldsOf(entity);
		const renamedLabel =
			entity === "clients" ? "Nome do cliente" : "Nome do serviço";
		const renamed = {
			...(name as ReturnType<typeof field>),
			label: renamedLabel,
		};
		serveTemplateOf(entityTemplate(entity, [], {}, [renamed, ...rest]));

		await openNew(entity, h);

		const el = titleInput(renamedLabel);
		expect(screen.getByRole("textbox", { name: renamedLabel })).toBe(el);
		expect(el.getAttribute("aria-label")).toBe(renamedLabel);
	});

	it("AC-0007-06 the name's help text shows under the heading input as its accessible description", async () => {
		const [name, ...rest] = systemFieldsOf(entity);
		const helped = {
			...(name as ReturnType<typeof field>),
			helpText: "Como aparece na agenda",
		};
		serveTemplateOf(entityTemplate(entity, [], {}, [helped, ...rest]));

		await openNew(entity, h);

		const el = titleInput(nameLabel);
		expect(describedText(el)).toContain("Como aparece na agenda");
		const help = screen.getByText("Como aparece na agenda");
		// under the heading input and above the subtitle
		expect(
			el.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			help.compareDocumentPosition(subtitle()) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("AC-0007-09 the heading input cannot be edited while the save is pending", async () => {
		serveTemplateOf(entityTemplate(entity, []));
		h.state.create = () => never() as never;
		await openNew(entity, h);
		for (const [label, typed] of VALID_SYSTEM[entity])
			typeInto(
				label === nameLabel
					? titleInput(label)
					: screen.getByLabelText(labelRe(label)),
				typed,
			);

		fireEvent.click(screen.getByRole("button", { name: tr("form.save") }));

		await screen.findByRole("button", { name: tr("form.saving") });
		expect(titleInput(nameLabel).disabled).toBe(true);
	});

	it("AC-0007-10 typing only a name and pressing Cancelar asks to discard", async () => {
		serveTemplateOf(entityTemplate(entity, []));
		await openNew(entity, h);
		typeInto(titleInput(nameLabel), "Ana");

		fireEvent.click(screen.getByRole("button", { name: tr("form.cancel") }));

		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByText(tr("form.discard"))).toBeTruthy();
		expect(navigatedTo()).toHaveLength(0);
	});

	it("AC-0007-11 a name placed last by the template is still the heading input; the other fields keep their order", async () => {
		const [name, ...rest] = systemFieldsOf(entity);
		serveTemplateOf(
			entityTemplate(entity, [], {}, [
				...rest,
				name as ReturnType<typeof field>,
			]),
		);

		await openNew(entity, h);

		const el = titleInput(nameLabel);
		expect(
			el.compareDocumentPosition(subtitle()) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(inputNamesAfter(subtitle())).toEqual(others);
	});

	it("AC-0007-12 the edit page pre-fills the heading input with the stored name and does not repeat it", async () => {
		const stored = String(SYSTEM_ATTRIBUTES[entity].name);
		await openEdit(entity, h, record(entity));

		const el = titleInput(nameLabel);
		expect(el.value).toBe(stored);
		expect(screen.getAllByLabelText(labelRe(nameLabel))).toHaveLength(1);
		expect(inputNamesAfter(subtitle())).toEqual(others);
	});

	it("AC-0007-13 on the edit page the hidden level-1 heading keeps the stored name while the name is retyped", async () => {
		const stored = String(SYSTEM_ATTRIBUTES[entity].name);
		await openEdit(entity, h, record(entity));
		expect(h1s().map((e) => e.textContent)).toEqual([stored]);

		typeInto(titleInput(nameLabel), "Ana Lima");

		expect(titleInput(nameLabel).value).toBe("Ana Lima");
		expect(h1s().map((e) => e.textContent)).toEqual([stored]);
	});

	it("AC-0007-14 after record.form-changed the reloaded page still shows the typed name", async () => {
		const sys = systemFieldsOf(entity);
		const v2 = entityTemplate(entity, [], { version: 2 }, sys);
		const v3 = entityTemplate(entity, [], { version: 3 }, sys);
		let latest = v2;
		on("GET", `/api/forms/${FORM_ID}`, () => ({ status: 200, body: latest }));
		h.state.create = async () => {
			latest = v3;
			return { ok: false, error: "record.form-changed", field: "formVersion" };
		};
		await openNew(entity, h);
		for (const [label, typed] of VALID_SYSTEM[entity])
			typeInto(
				label === nameLabel
					? titleInput(label)
					: screen.getByLabelText(labelRe(label)),
				typed,
			);

		fireEvent.click(screen.getByRole("button", { name: tr("form.save") }));

		await screen.findByText(tr("form.formChanged"));
		expect(titleInput(nameLabel).value).toBe(VALID_SYSTEM[entity][0]?.[1]);
	});

	it('AC-0007-18 another tenant\'s record shows "Cadastro não encontrado." with a way back and no heading input', async () => {
		h.state.read = async () => ({ ok: false, error: ENTITY[entity].notFound });
		render(h, { mode: "edit", recordId: RECORD_ID });

		await screen.findByText(tr("form.notFound"));

		expect(
			screen.getByRole("link", { name: tr("form.back") }).getAttribute("href"),
		).toBe(h.adapter.listHref);
		expect(screen.queryByPlaceholderText(nameLabel)).toBeNull();
		expect(screen.queryByLabelText(labelRe(nameLabel))).toBeNull();
	});

	it("AC-0007-20 the level-1 heading is visually hidden and no visible text reads the new-record title", async () => {
		serveTemplateOf(entityTemplate(entity, []));

		await openNew(entity, h);

		const [heading, ...extra] = h1s();
		expect(extra).toHaveLength(0);
		expect(heading?.className).toContain("sr-only");
		expect(heading?.textContent).toBe(newTitle);
		// every element with the title text is that hidden heading
		for (const el of screen.getAllByText(newTitle)) expect(el).toBe(heading);
	});

	it('AC-0007-21 an archived template shows "Este modelo não está disponível." with a way back and no heading input', async () => {
		serveTemplateOf(entityTemplate(entity, [], { status: "archived" }));
		render(h, { mode: "create", formId: FORM_ID });

		await screen.findByText(tr("form.unavailable"));

		expect(
			screen.getByRole("link", { name: tr("form.back") }).getAttribute("href"),
		).toBe(h.adapter.listHref);
		expect(screen.queryByPlaceholderText(nameLabel)).toBeNull();
		expect(screen.queryByLabelText(labelRe(nameLabel))).toBeNull();
	});

	it("R6 with the name placed last, a blank name still takes the focus first", async () => {
		const [name, ...rest] = systemFieldsOf(entity);
		serveTemplateOf(
			entityTemplate(entity, [], {}, [
				...rest,
				name as ReturnType<typeof field>,
			]),
		);
		await openNew(entity, h);

		fireEvent.click(screen.getByRole("button", { name: tr("form.save") }));

		await waitFor(() =>
			expect(
				screen.getByPlaceholderText(nameLabel).getAttribute("aria-invalid"),
			).toBe("true"),
		);
		expect(document.activeElement).toBe(titleInput(nameLabel));
		expect(h.log.creates).toHaveLength(0);
	});
});
