// Shared test harness for SPEC-0004 web tests (W-list, W-cform, W-cview).
// Builds on record-harness / forms-harness: the BFF transport is faked at the
// axios adapter and global fetch, and the pages run with the real client
// adapter, real components and real pt-BR messages.
//
// Faked BFF routes: /api/clients, /api/clients/consent, /api/clients/:id and its
// /inactivate, /reactivate, /delete, plus /api/forms, /api/forms/:id and
// /api/forms/:id/versions/:v (served by record-harness helpers).
//
// vi.mock calls are hoisted per file, so each test file repeats the three
// factories (axios adapter, @/i18n/navigation, next/navigation).

import type { ClientResponse, ClientSummary } from "@planici/schemas";
import {
	FORM_ID,
	on,
	RECORD_ID,
	type summary,
	tClients,
} from "./record-harness";

export * from "./record-harness";

export const CLIENT_ID = RECORD_ID;
export const MASK = "••••••";
export const tc = tClients;

/** A client as `GET /api/clients/:id` returns it. */
export function client(over: Partial<ClientResponse> = {}): ClientResponse {
	return {
		id: CLIENT_ID,
		form: {
			id: FORM_ID,
			name: "Ficha",
			version: 1,
			latestVersion: 1,
			status: "active",
		},
		revision: 3,
		values: {},
		missingRequired: [],
		createdAt: "2026-11-01T12:00:00.000Z",
		updatedAt: "2026-11-01T12:00:00.000Z",
		name: "Ana Souza",
		email: "ana@example.com",
		phone: null,
		status: "active",
		hasHistory: false,
		consentAttestation: {
			attestedBy: "user-1",
			attestedAt: "2026-11-01T12:00:00.000Z",
			textVersion: "1",
		},
		...over,
	};
}

let rowSeq = 0;

/** A row of `GET /api/clients`. */
export function clientRow(
	name: string,
	over: Partial<ClientSummary> = {},
): ClientSummary {
	rowSeq += 1;
	return {
		id: `11111111-1111-4111-8111-${String(rowSeq).padStart(12, "0")}`,
		name,
		email: `${name.toLowerCase().replace(/\W+/g, ".")}@example.com`,
		phone: null,
		formId: FORM_ID,
		formName: "Ficha",
		status: "active",
		...over,
	};
}

export type ListReply = { clients: ClientSummary[]; nextCursor: string | null };

export const EMPTY_LIST: ListReply = { clients: [], nextCursor: null };

/** Serves `GET /api/clients`; the handler sees the query (q, status, limit, after). */
export function serveList(
	handler: ListReply | ((query: URLSearchParams) => ListReply | number),
) {
	on("GET", "/api/clients", (call) => {
		const out = typeof handler === "function" ? handler(call.query) : handler;
		return typeof out === "number"
			? { status: out, body: { error: "unexpected" } }
			: { status: 200, body: out };
	});
}

/** The client-template read behind the [Novo] menu: `GET /api/forms?type=client`. */
export function serveClientTemplates(
	forms: ReturnType<typeof summary>[],
	seen: URLSearchParams[] = [],
) {
	on("GET", "/api/forms", (call) => {
		seen.push(call.query);
		const wantsArchived = call.query.get("includeArchived") === "true";
		const type = call.query.get("type");
		return {
			status: 200,
			body: {
				forms: forms.filter(
					(f) =>
						(type === null || f.type === type) &&
						(wantsArchived || f.status === "active"),
				),
			},
		};
	});
}

/** `GET /api/clients/consent`: the text and version the BFF serves. */
export function serveConsent(text: string, version = "1") {
	on("GET", "/api/clients/consent", { status: 200, body: { version, text } });
}

export const clientPath = (id: string = CLIENT_ID) => `/api/clients/${id}`;

/** Registers a handler that reads the current client from `box.current`. */
export function serveClient(box: { current: ClientResponse }) {
	on("GET", clientPath(box.current.id), () => ({
		status: 200,
		body: box.current,
	}));
}

/** Waits `ms` (real timers): to prove that nothing was sent after a debounce. */
export const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

/** True when the button is disabled by attribute or by aria. */
export function isDisabled(el: Element): boolean {
	return (
		(el as HTMLButtonElement).disabled ||
		el.getAttribute("aria-disabled") === "true"
	);
}
