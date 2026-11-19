// W-cform: SPEC-0004 AC-0004-04 (toast + view), -29, -30, -31, -57 and AC-0001-10
// (/clients/new?form=<id> mounts the fill-in form). The pages run with the real
// client adapter; the BFF is faked by clients-harness.
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientEditPage } from "@/app/[lang]/(private)/orgs/[tenant]/clients/_components/client-edit-page";
import { NewClientPage } from "@/app/[lang]/(private)/orgs/[tenant]/clients/_components/new-client-page";
import {
	CLIENT_ID,
	callsTo,
	client,
	clientPath,
	describedText,
	entityTemplate,
	FORM_ID,
	labelRe,
	navigatedTo,
	on,
	renderApp,
	resetApi,
	serveConsent,
	serveTemplateOf,
	serveVersion,
	setRoute,
	stubFetch,
	systemFieldsOf,
	tc,
	tValidation,
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
	// the route is /clients/new?form=<id>
	setRoute({ search: `form=${FORM_ID}`, pathname: "/orgs/x/clients/new" });
	vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ helpers

const CONSENT_TEXT = tc("form.consent");
const input = (label: string) =>
	screen.getByLabelText(labelRe(label)) as HTMLInputElement;
const typeInto = (label: string, value: string) =>
	fireEvent.change(input(label), { target: { value } });
const saveButton = () => screen.getByRole("button", { name: tc("form.save") });
const consentBox = (text = CONSENT_TEXT) =>
	screen.getByRole("checkbox", { name: text }) as HTMLInputElement;
const createCalls = () => callsTo("POST", "/api/clients");

/** Serves the template and the consent text, mounts /clients/new?form=<id>. */
async function openNew(
	consent: { text: string; version?: string } = { text: CONSENT_TEXT },
) {
	serveTemplateOf(entityTemplate("clients", []));
	serveConsent(consent.text, consent.version);
	renderApp(<NewClientPage />);
	await screen.findByLabelText(labelRe("Nome completo"));
}

function fillValid() {
	typeInto("Nome completo", "  Ana   Souza ");
	typeInto("E-mail", " ANA@Example.com ");
}

// ------------------------------------------------------------------- tests

describe("Fill-in page of a new client", () => {
	it("AC-0001-10 mounts the fill-in form for the template in ?form=<id>", async () => {
		await openNew();

		expect(input("Nome completo")).toBeTruthy();
		expect(input("E-mail")).toBeTruthy();
		expect(callsTo("GET", `/api/forms/${FORM_ID}`).length).toBeGreaterThan(0);
	});

	it("AC-0004-29 shows an unchecked consent checkbox with the attestation text above Salvar", async () => {
		await openNew();

		const box = await screen.findByRole("checkbox", { name: CONSENT_TEXT });
		expect((box as HTMLInputElement).checked).toBe(false);
		// the box comes before the save button in the page
		expect(
			box.compareDocumentPosition(saveButton()) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("AC-0004-30 shows the inline consent error and sends no request when Salvar is pressed with the box unchecked", async () => {
		await openNew();
		fillValid();

		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(describedText(consentBox())).toContain(
				tValidation("consentAttested.required"),
			),
		);
		expect(createCalls()).toHaveLength(0);
	});

	it("AC-0004-04 (toast + view) saves with the consent, shows the created toast and opens the client's view page", async () => {
		await openNew();
		fillValid();
		fireEvent.click(consentBox());
		on("POST", "/api/clients", { status: 201, body: client() });

		fireEvent.click(saveButton());

		await screen.findByText(tc("toast.created"));
		await waitFor(() =>
			expect(navigatedTo().join(" ")).toContain(`/clients/${CLIENT_ID}`),
		);
		expect(createCalls()).toHaveLength(1);
		expect(createCalls()[0]?.body).toMatchObject({
			formId: FORM_ID,
			consentAttested: true,
			consentTextVersion: "1",
		});
	});

	it("AC-0004-57 shows the current text with the box unchecked, the banner and the typed values after a 409 consentText.outdated", async () => {
		const NEW_TEXT = "Texto de consentimento revisado, versão 2.";
		await openNew();
		fillValid();
		fireEvent.click(consentBox());
		// the BFF now serves the deployed text
		serveConsent(NEW_TEXT, "2");
		on("POST", "/api/clients", {
			status: 409,
			body: { error: "consentText.outdated", field: "consentTextVersion" },
		});

		fireEvent.click(saveButton());

		await screen.findByText(tc("form.consentOutdated"));
		const box = await screen.findByRole("checkbox", { name: NEW_TEXT });
		expect((box as HTMLInputElement).checked).toBe(false);
		expect(input("Nome completo").value).toContain("Ana");
		expect(input("E-mail").value.toLowerCase()).toContain("ana@example.com");
		expect(createCalls()).toHaveLength(1);
	});

	it("AC-0004-57 resubmits with the new text version after the owner confirms again", async () => {
		await openNew();
		fillValid();
		fireEvent.click(consentBox());
		serveConsent("Texto revisado, versão 2.", "2");
		on("POST", "/api/clients", {
			status: 409,
			body: { error: "consentText.outdated", field: "consentTextVersion" },
		});
		fireEvent.click(saveButton());
		await screen.findByText(tc("form.consentOutdated"));
		on("POST", "/api/clients", { status: 201, body: client() });

		fireEvent.click(
			await screen.findByRole("checkbox", {
				name: "Texto revisado, versão 2.",
			}),
		);
		fireEvent.click(saveButton());

		await screen.findByText(tc("toast.created"));
		expect(createCalls()).toHaveLength(2);
		expect(createCalls()[1]?.body).toMatchObject({
			consentAttested: true,
			consentTextVersion: "2",
		});
	});
});

describe("Edit page of an existing client", () => {
	it("AC-0004-31 shows no consent checkbox", async () => {
		const c = client();
		serveVersion(c.form.version, systemFieldsOf("clients"));
		on("GET", clientPath(c.id), { status: 200, body: c });
		serveConsent(CONSENT_TEXT);
		renderApp(<ClientEditPage clientId={c.id} />);

		await screen.findByLabelText(labelRe("Nome completo"));

		expect(input("Nome completo").value).toBe("Ana Souza");
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByText(CONSENT_TEXT)).toBeNull();
	});
});
