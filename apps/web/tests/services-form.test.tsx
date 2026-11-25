// W-sform: SPEC-0005 AC-0005-20, -56, -77 to -81 and the §8 inline "name taken"
// state. The pages run with the real service adapter (price mask, duration
// input of R13) and the real record form; the BFF is faked by services-harness.
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewServicePage } from "@/app/[lang]/(private)/orgs/[tenant]/services/_components/new-service-page";
import { ServiceEditPage } from "@/app/[lang]/(private)/orgs/[tenant]/services/_components/service-edit-page";
import {
	callsTo,
	describedText,
	FORM_ID,
	labelRe,
	navigatedTo,
	on,
	renderServices,
	resetApi,
	SERVICE_ID,
	serveTemplateOf,
	serveVersion,
	service,
	servicePath,
	serviceSystemFields,
	serviceTemplate,
	setRoute,
	stubFetch,
	ts,
	tv,
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
	// the route is /services/new?form=<id>
	setRoute({ search: `form=${FORM_ID}`, pathname: "/orgs/x/services/new" });
	vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ helpers

const input = (label: string) =>
	screen.getByLabelText(labelRe(label)) as HTMLInputElement;
const typeInto = (label: string, value: string) =>
	fireEvent.change(input(label), { target: { value } });
const saveButton = () => screen.getByRole("button", { name: ts("form.save") });
const createCalls = () => callsTo("POST", "/api/services");
/** The heading input of SPEC-0007: the name, found by its placeholder. */
const titleInput = () =>
	screen.getByPlaceholderText("Nome") as HTMLInputElement;
const h1s = () => screen.queryAllByRole("heading", { level: 1 });

/** Serves the template of the seeded "Serviço" and mounts /services/new?form=<id>. */
async function openNew() {
	serveTemplateOf(serviceTemplate());
	renderServices(<NewServicePage />);
	await screen.findByLabelText(labelRe("Nome"));
}

/** A valid name and price, and the duration as typed. */
function fill(duration: string) {
	typeInto("Nome", "Sessão individual");
	typeInto("Duração", duration);
	typeInto("Preço", "150,00");
}

// ------------------------------------------------------------------- tests

describe("Fill-in page of a new service", () => {
	it("AC-0005-20 mounts the fill-in form with the fields Nome, Duração and Preço of the template", async () => {
		await openNew();

		expect(input("Nome")).toBeTruthy();
		expect(input("Duração")).toBeTruthy();
		expect(input("Preço")).toBeTruthy();
		expect(callsTo("GET", `/api/forms/${FORM_ID}`).length).toBeGreaterThan(0);
	});

	it("AC-0005-20 sends priceCents 15000 and currency BRL for the price typed as '150,00'", async () => {
		await openNew();
		fill("90");
		on("POST", "/api/services", { status: 201, body: service() });

		fireEvent.click(saveButton());

		await screen.findByText(ts("toast.created"));
		await waitFor(() =>
			expect(navigatedTo().join(" ")).toContain(`/services/${SERVICE_ID}`),
		);
		expect(createCalls()).toHaveLength(1);
		expect(createCalls()[0]?.body).toMatchObject({
			formId: FORM_ID,
			name: "Sessão individual",
			durationMinutes: 90,
			priceCents: 15000,
			currency: "BRL",
		});
	});

	it("AC-0005-56 sends durationMinutes 90 for the duration typed as '1h 30'", async () => {
		await openNew();
		fill("1h 30");
		on("POST", "/api/services", { status: 201, body: service() });

		fireEvent.click(saveButton());

		await screen.findByText(ts("toast.created"));
		expect(createCalls()).toHaveLength(1);
		expect(createCalls()[0]?.body).toMatchObject({
			durationMinutes: 90,
			priceCents: 15000,
		});
	});

	it.each([
		["1h30", 90],
		["1h 30min", 90],
		["1H 30", 90],
		["90min", 90],
		["1h", 60],
		["45", 45],
	])("AC-0005-56 sends the minutes of R13 for the duration typed as %j", async (typed, minutes) => {
		await openNew();
		fill(typed);
		on("POST", "/api/services", { status: 201, body: service() });

		fireEvent.click(saveButton());

		await screen.findByText(ts("toast.created"));
		expect(createCalls()[0]?.body).toMatchObject({ durationMinutes: minutes });
	});

	const REJECTED: [ac: string, typed: string][] = [
		["AC-0005-77", "abc"],
		["AC-0005-77", "1:30"],
		["AC-0005-77", "1,5h"],
		["AC-0005-77", "90.5"],
		["AC-0005-78", "3"],
		["AC-0005-78", "4"],
		["AC-0005-78", "1441"],
		["AC-0005-79", "1h 75"],
	];

	it.each(
		REJECTED,
	)("%s shows the inline duration error under Duração and sends no request for %j", async (_ac, typed) => {
		await openNew();
		fill(typed);

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(input("Duração"))).toContain(
				tv("serviceDuration.invalid"),
			),
		);
		expect(createCalls()).toHaveLength(0);
	});

	it("AC-0005-77 keeps the other fields filled after the duration error", async () => {
		await openNew();
		fill("abc");

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(input("Duração"))).toContain(
				tv("serviceDuration.invalid"),
			),
		);
		expect(input("Nome").value).toBe("Sessão individual");
		expect(input("Duração").value).toBe("abc");
	});

	it('AC-0007-07 (service) a blank name shows "Informe o nome do serviço." under the heading input, "Corrija 1 campo", and focuses it', async () => {
		await openNew();
		typeInto("Duração", "90");
		typeInto("Preço", "150,00");

		fireEvent.click(saveButton());

		await screen.findByText(ts("form.errorSummary", { count: 1 }));
		const el = titleInput();
		expect(describedText(el)).toContain(tv("serviceName.required"));
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(document.activeElement).toBe(el);
		expect(createCalls()).toHaveLength(0);
	});

	it("AC-0007-08 a 409 serviceName.taken shows under the heading input, focuses it and keeps every typed value", async () => {
		await openNew();
		fill("90");
		on("POST", "/api/services", {
			status: 409,
			body: { error: "serviceName.taken", field: "name" },
		});

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(titleInput())).toContain(tv("serviceName.taken")),
		);
		expect(titleInput().getAttribute("aria-invalid")).toBe("true");
		await waitFor(() => expect(document.activeElement).toBe(titleInput()));
		expect(createCalls()).toHaveLength(1);
		expect(titleInput().value).toBe("Sessão individual");
		expect(input("Duração").value).toBe("90");
		expect(input("Preço").value).not.toBe("");
		expect(navigatedTo().join(" ")).not.toContain(`/services/${SERVICE_ID}`);
	});

	it("AC-0007-15 the typed name is sent as the service's name and the view page opens with the created toast", async () => {
		await openNew();
		fill("90");
		on("POST", "/api/services", { status: 201, body: service() });

		fireEvent.click(saveButton());

		await screen.findByText("Serviço cadastrado");
		await waitFor(() =>
			expect(navigatedTo().join(" ")).toContain(`/services/${SERVICE_ID}`),
		);
		expect(createCalls()).toHaveLength(1);
		expect(createCalls()[0]?.body).toMatchObject({ name: "Sessão individual" });
		expect(titleInput().value).toBe("Sessão individual");
	});

	it("AC-0007-19 a name over the limit shows the length error under the heading input", async () => {
		await openNew();
		fill("90");
		fireEvent.change(titleInput(), { target: { value: "a".repeat(81) } });

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(titleInput())).toContain(tv("serviceName.max")),
		);
		expect(titleInput().getAttribute("aria-invalid")).toBe("true");
		expect(createCalls()).toHaveLength(0);
	});
});

describe("Edit page of an existing service", () => {
	async function openEdit(over = {}) {
		const s = service(over);
		serveVersion(s.form.version, serviceSystemFields());
		on("GET", servicePath(s.id), { status: 200, body: s });
		renderServices(<ServiceEditPage serviceId={s.id} />);
		await screen.findByLabelText(labelRe("Nome"));
		return s;
	}

	it("AC-0005-80 fills the duration field with '1h 30min' for a service of 90 minutes", async () => {
		await openEdit({ durationMinutes: 90 });

		expect(input("Duração").value).toBe("1h 30min");
		expect(input("Nome").value).toBe("Sessão individual");
	});

	it.each([
		[45, "45min"],
		[120, "2h"],
	])("AC-0005-80 fills the duration field in the display form of R12: %i minutes as %s", async (minutes, shown) => {
		await openEdit({ durationMinutes: minutes });

		expect(input("Duração").value).toBe(shown);
	});

	it("AC-0005-81 sends durationMinutes 90 when Salvar is pressed without changing anything, and shows the saved toast on 200", async () => {
		const s = await openEdit({ durationMinutes: 90, priceCents: 15000 });
		on("PATCH", servicePath(s.id), {
			status: 200,
			body: { ...s, revision: s.revision + 1 },
		});

		fireEvent.click(saveButton());

		await screen.findByText(ts("toast.saved"));
		const [patch] = callsTo("PATCH", servicePath(s.id));
		expect(callsTo("PATCH", servicePath(s.id))).toHaveLength(1);
		expect(patch?.body).toMatchObject({
			revision: s.revision,
			name: "Sessão individual",
			durationMinutes: 90,
			priceCents: 15000,
			currency: "BRL",
		});
	});

	it("AC-0005-81 sends the minutes of the duration that was retyped", async () => {
		const s = await openEdit({ durationMinutes: 90 });
		on("PATCH", servicePath(s.id), {
			status: 200,
			body: { ...s, durationMinutes: 150, revision: s.revision + 1 },
		});

		typeInto("Duração", "2h 30");
		fireEvent.click(saveButton());

		await screen.findByText(ts("toast.saved"));
		expect(callsTo("PATCH", servicePath(s.id))[0]?.body).toMatchObject({
			durationMinutes: 150,
		});
	});

	it("AC-0005-77 shows the inline duration error and sends no request when the edited duration is unreadable", async () => {
		const s = await openEdit({ durationMinutes: 90 });

		typeInto("Duração", "abc");
		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(input("Duração"))).toContain(
				tv("serviceDuration.invalid"),
			),
		);
		expect(callsTo("PATCH", servicePath(s.id))).toHaveLength(0);
	});
	it("AC-0007-16 clearing the name on the edit page shows the name error under the heading input and keeps the stored name in the hidden heading", async () => {
		const s = await openEdit();

		fireEvent.change(titleInput(), { target: { value: "" } });
		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(titleInput())).toContain(tv("serviceName.required")),
		);
		expect(titleInput().getAttribute("aria-invalid")).toBe("true");
		expect(h1s().map((e) => e.textContent)).toEqual(["Sessão individual"]);
		expect(callsTo("PATCH", servicePath(s.id))).toHaveLength(0);
	});
});
