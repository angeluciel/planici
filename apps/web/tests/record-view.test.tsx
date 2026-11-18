// W-view: SPEC-0003 AC-0003-15, -16 (view part), -18, -25, -27, -29, -46, -50, -52,
// -70, -84, -85, -92, -95, -96 and the option-removal support check. Run for
// `clients` and `services`. The version read goes through forms-harness; the
// record read goes through the fake RecordAdapter of record-harness.
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordView } from "@/app/[lang]/(private)/orgs/[tenant]/_components/records/record-view";
import {
	callsTo,
	ENTITIES,
	ENTITY,
	type Entity,
	type FakeAdapter,
	FORM_ID,
	fakeAdapter,
	field,
	formatDuration,
	formatPrice,
	never,
	pageText,
	RECORD_ID,
	record,
	renderApp,
	resetApi,
	serveVersion,
	setRoute,
	stubFetch,
	systemFieldsOf,
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
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ helpers

const MASK = "••••••";

type Fields = ReturnType<typeof systemFieldsOf>;
let shownLabels: string[] = [];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The leaf element that carries `label` (alone, or followed by ":" and the value). */
function labelEl(
	label: string,
	root: ParentNode = document.body,
): Element | null {
	const re = new RegExp(`^${escapeRe(label)}(:|$)`);
	return (
		Array.from(root.querySelectorAll("*")).find(
			(el) =>
				el.children.length === 0 && re.test((el.textContent ?? "").trim()),
		) ?? null
	);
}

/** The smallest container of `label` that holds no other field's label. */
function rowOf(label: string): HTMLElement {
	const start = labelEl(label);
	if (!start) throw new Error(`No label "${label}" on the page`);
	const others = shownLabels.filter((l) => l !== label);
	let node: HTMLElement = start as HTMLElement;
	while (node.parentElement) {
		const parent = node.parentElement;
		if (others.some((l) => labelEl(l, parent))) break;
		if (parent === document.body) break;
		node = parent;
	}
	return node;
}

async function openView(
	entity: Entity,
	h: FakeAdapter,
	rec: ReturnType<typeof record>,
	fields: Fields,
) {
	serveVersion(rec.form.version, fields);
	h.state.read = async () => ({ ok: true, record: rec });
	shownLabels = fields.map((f) => f.label);
	renderApp(<RecordView adapter={h.adapter} recordId={RECORD_ID} />);
	await screen.findByText(
		new RegExp(`^${escapeRe(ENTITY[entity].systemLabels[0])}(:|$)`),
	);
}

const loadingMarker = (copy: string) =>
	screen.findAllByLabelText(copy).catch(() => screen.findAllByText(copy));

const olderVersion = (rec: ReturnType<typeof record>) => ({
	...rec,
	form: { ...rec.form, version: 1, latestVersion: 2 },
});

// ------------------------------------------------------------------- tests

describe.each(ENTITIES)("W-view (%s)", (entity) => {
	const tr = ENTITY[entity].tr;
	let h: FakeAdapter;
	let sys: Fields;
	beforeEach(() => {
		h = fakeAdapter(entity);
		sys = systemFieldsOf(entity);
	});

	it("AC-0003-15 shows a relabelled field with its stored value under the new label", async () => {
		// the version read already carries the new label; the stored value is unchanged
		const ocupacao = field({ label: "Ocupação", type: "text" });
		const rec = record(entity, { values: { [ocupacao.id]: "Engenheira" } });

		await openView(entity, h, rec, [...sys, ocupacao]);

		expect(rowOf("Ocupação").textContent).toContain("Engenheira");
		expect(screen.queryByText(/Profissão/)).toBeNull();
	});

	it("AC-0003-16 (view part) shows a field removed from the latest version with its value, from the record's own version", async () => {
		const hobby = field({ label: "Hobby", type: "text" });
		const rec = olderVersion(
			record(entity, { values: { [hobby.id]: "Corrida" } }),
		);

		await openView(entity, h, rec, [...sys, hobby]);

		expect(rowOf("Hobby").textContent).toContain("Corrida");
		expect(callsTo("GET", `/api/forms/${FORM_ID}/versions/1`)).toHaveLength(1);
	});

	it("AC-0003-18 masks a protected value with Mostrar, shows it on press and masks it again after a remount", async () => {
		const diagnostico = field({
			label: "Diagnóstico",
			type: "text",
			sensitive: true,
		});
		const rec = record(entity, { values: { [diagnostico.id]: "Hipertensão" } });
		const fields = [...sys, diagnostico];
		await openView(entity, h, rec, fields);
		const row = rowOf("Diagnóstico");
		expect(row.textContent).toContain(MASK);
		expect(pageText()).not.toContain("Hipertensão");

		fireEvent.click(
			within(row).getByRole("button", {
				name: new RegExp(`^${tr("view.reveal")}`),
			}),
		);

		await waitFor(() =>
			expect(rowOf("Diagnóstico").textContent).toContain("Hipertensão"),
		);
		cleanup();
		await openView(entity, h, rec, fields);
		expect(rowOf("Diagnóstico").textContent).toContain(MASK);
		expect(pageText()).not.toContain("Hipertensão");
	});

	it("AC-0003-25 shows version 1's fields and the older-version notice when the latest version is 2", async () => {
		const hobby = field({ label: "Hobby", type: "text" });
		const rec = olderVersion(
			record(entity, { values: { [hobby.id]: "Corrida" } }),
		);

		await openView(entity, h, rec, [...sys, hobby]);

		expect(rowOf("Hobby")).toBeTruthy();
		expect(pageText()).toContain(tr("view.olderVersion"));
	});

	it("AC-0003-27 shows a protected cpf masked, then formatted after Mostrar", async () => {
		const cpf = field({ label: "CPF", type: "cpf", sensitive: true });
		const rec = record(entity, { values: { [cpf.id]: "52998224725" } });
		await openView(entity, h, rec, [...sys, cpf]);
		expect(rowOf("CPF").textContent).toContain(MASK);
		expect(pageText()).not.toContain("52998224725");

		fireEvent.click(
			within(rowOf("CPF")).getByRole("button", {
				name: new RegExp(`^${tr("view.reveal")}`),
			}),
		);

		await waitFor(() =>
			expect(rowOf("CPF").textContent).toContain("529.982.247-25"),
		);
	});

	it("AC-0003-29 marks a required field without a value as pending and no other field", async () => {
		const profissao = field({
			label: "Profissão",
			type: "text",
			required: true,
		});
		const objetivo = field({ label: "Objetivo", type: "long_text" });
		const rec = record(entity, { missingRequired: [profissao.id] });

		await openView(entity, h, rec, [...sys, profissao, objetivo]);

		expect(rowOf("Profissão").textContent).toContain(
			tr("view.missingRequired"),
		);
		expect(rowOf("Objetivo").textContent).not.toContain(
			tr("view.missingRequired"),
		);
	});

	it("AC-0003-46 shows the template name and version, with the name linking to the template editor", async () => {
		const rec = record(entity, {
			form: {
				id: FORM_ID,
				name: "Ficha",
				version: 2,
				latestVersion: 2,
				status: "active",
			},
		});

		await openView(entity, h, rec, sys);

		expect(pageText()).toContain(
			tr("view.version", { name: "Ficha", version: 2 }),
		);
		const link = screen.getByRole("link", { name: "Ficha" });
		expect(link.getAttribute("href")).toContain(`/forms/${FORM_ID}`);
		expect(pageText()).not.toContain(tr("view.olderVersion"));
	});

	it("AC-0003-50 says the record was not found for an unknown record id", async () => {
		// the default fake read answers with the entity's 404 key
		renderApp(<RecordView adapter={h.adapter} recordId={RECORD_ID} />);

		await screen.findByText(tr("view.notFound"));
		expect(h.log.reads).toEqual([RECORD_ID]);
	});

	it("AC-0003-52 shows the load error with a retry that reads the record again", async () => {
		h.state.read = async () => ({ ok: false, error: "unexpected" });
		renderApp(<RecordView adapter={h.adapter} recordId={RECORD_ID} />);
		await screen.findByText(tr("view.loadError"));
		expect(h.log.reads).toHaveLength(1);
		serveVersion(1, sys);
		h.state.read = async () => ({ ok: true, record: record(entity) });
		shownLabels = sys.map((f) => f.label);

		fireEvent.click(screen.getByRole("button", { name: tr("form.retry") }));

		await screen.findByText(
			new RegExp(`^${escapeRe(ENTITY[entity].systemLabels[0])}(:|$)`),
		);
		expect(h.log.reads).toHaveLength(2);
		expect(screen.queryByText(tr("view.loadError"))).toBeNull();
	});

	it("AC-0003-70 shows a yes_no field without a value as Não", async () => {
		const fumante = field({ label: "Fumante", type: "yes_no" });
		const rec = record(entity, { values: { [fumante.id]: false } });

		await openView(entity, h, rec, [...sys, fumante]);

		expect(rowOf("Fumante").textContent).toContain(tr("view.no"));
	});

	it("AC-0003-84 shows a select option under its current label", async () => {
		const turno = field({
			label: "Turno",
			type: "select",
			options: [
				{ id: "opt-manha", label: "Manhã" },
				{ id: "opt-tarde", label: "Vespertino" },
			],
		});
		const rec = olderVersion(
			record(entity, { values: { [turno.id]: "opt-tarde" } }),
		);

		await openView(entity, h, rec, [...sys, turno]);

		expect(rowOf("Turno").textContent).toContain("Vespertino");
		expect(pageText()).not.toContain("Tarde");
	});

	it("AC-0003-85 masks a field turned protected after the record was saved", async () => {
		const hobby = field({ label: "Hobby", type: "text", sensitive: true });
		const rec = olderVersion(
			record(entity, { values: { [hobby.id]: "Corrida" } }),
		);

		await openView(entity, h, rec, [...sys, hobby]);

		const row = rowOf("Hobby");
		expect(row.textContent).toContain(MASK);
		expect(row.textContent).not.toContain("Corrida");
		expect(
			within(row).getByRole("button", {
				name: new RegExp(`^${tr("view.reveal")}`),
			}),
		).toBeTruthy();
	});

	it("AC-0003-92 shows the skeleton named by the loading copy while the record is pending", async () => {
		h.state.read = () => never() as never;

		renderApp(<RecordView adapter={h.adapter} recordId={RECORD_ID} />);

		const marker = await loadingMarker(tr("view.loading"));
		expect(marker.length).toBeGreaterThan(0);
	});

	it("AC-0003-95 shows an em dash for an optional field without a value", async () => {
		const hobby = field({ label: "Hobby", type: "text" });
		const rec = record(entity, { values: {} });

		await openView(entity, h, rec, [...sys, hobby]);

		expect(rowOf("Hobby").textContent).toContain(tr("view.empty"));
		expect(tr("view.empty")).toBe("—");
	});

	it("AC-0003-96 masks a revealed protected value again on Ocultar", async () => {
		const diagnostico = field({
			label: "Diagnóstico",
			type: "text",
			sensitive: true,
		});
		const rec = record(entity, { values: { [diagnostico.id]: "Hipertensão" } });
		await openView(entity, h, rec, [...sys, diagnostico]);
		fireEvent.click(
			within(rowOf("Diagnóstico")).getByRole("button", {
				name: new RegExp(`^${tr("view.reveal")}`),
			}),
		);
		await waitFor(() =>
			expect(rowOf("Diagnóstico").textContent).toContain("Hipertensão"),
		);

		fireEvent.click(
			within(rowOf("Diagnóstico")).getByRole("button", {
				name: new RegExp(`^${tr("view.hide")}`),
			}),
		);

		await waitFor(() =>
			expect(rowOf("Diagnóstico").textContent).toContain(MASK),
		);
		expect(pageText()).not.toContain("Hipertensão");
	});

	it("support option removed with Manter existentes: the record stays on its version and view shows the removed option", async () => {
		// supports SPEC-0004's check of AC-0002-19; claims no verification
		const turno = field({
			label: "Turno",
			type: "select",
			options: [
				{ id: "opt-manha", label: "Manhã" },
				{ id: "opt-tarde", label: "Tarde" },
			],
		});
		const rec = olderVersion(
			record(entity, { values: { [turno.id]: "opt-tarde" } }),
		);

		await openView(entity, h, rec, [...sys, turno]);

		expect(rowOf("Turno").textContent).toContain("Tarde");
		expect(callsTo("GET", `/api/forms/${FORM_ID}/versions/1`)).toHaveLength(1);
	});
});

describe("W-view (services) system field formats", () => {
	it("AC-0003-46 (services format) shows duration and price through the system formatters, never raw", async () => {
		const h = fakeAdapter("services");
		const sys = systemFieldsOf("services");
		const rec = record("services", { durationMinutes: 90, priceCents: 15000 });

		await openView("services", h, rec, sys);

		expect(formatDuration(90)).toBe("1h 30min");
		expect(formatPrice(15000)).toBe("R$ 150,00");
		expect(rowOf("Duração (minutos)").textContent).toContain("1h 30min");
		expect(rowOf("Preço").textContent).toContain("R$ 150,00");
		expect(pageText()).not.toContain("15000");
		expect(rowOf("Duração (minutos)").textContent).not.toMatch(
			/(^|\D)90(\D|$)/,
		);
	});
});
