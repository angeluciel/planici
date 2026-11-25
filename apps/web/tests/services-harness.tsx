// Shared test harness for the SPEC-0005 web tests (W-slist, W-snarrow, W-sform,
// W-sview). Builds on record-harness / clients-harness: the BFF transport is
// faked at the axios adapter and global fetch, and the pages run with the real
// service adapter, real components and real pt-BR messages.
//
// Faked BFF routes: /api/services (list, create), /api/services/templates (the
// narrow chips), /api/services/:id and its /inactivate, /reactivate, /delete,
// plus /api/forms and /api/forms/:id[/versions/:v] (record-harness helpers).
// `serveBackend` answers the service routes from one mutable state, so an
// archive, a reactivation or a delete shows in the next list and summary read,
// as the real API would.
//
// vi.mock calls are hoisted per file, so each test file repeats the three
// factories (axios adapter, @/i18n/navigation, next/navigation); the swipe tests
// add the motion/react stub (swipe-row-stub.tsx).

import { getMessages } from "@planici/i18n";
import type {
	FormTemplate,
	ServiceResponse,
	ServiceSummary,
	ServiceTemplateSummary,
} from "@planici/schemas";
import { fireEvent, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import {
	FORM_ID,
	field,
	on,
	RECORD_ID,
	summary,
	template,
} from "./record-harness";

// jsdom has no pointer capture; sonner calls it on a toast's pointer down, which
// `press` sends to the toast's action button (wiring, not an assertion).
for (const method of ["setPointerCapture", "releasePointerCapture"] as const) {
	if (!(method in Element.prototype)) {
		Object.defineProperty(Element.prototype, method, {
			configurable: true,
			value: () => undefined,
		});
	}
}

export {
	isDisabled,
	renderClients as renderServices,
	restoreBrowserZone,
	restoreClientsScreen as restoreServicesScreen,
	setBrowserZone,
	setClientsScreen as setServicesScreen,
	settle,
	spyScrollTo,
	stubIntersection,
} from "./clients-harness";
export * from "./record-harness";

// ------------------------------------------------------------- translators

type Translate = (key: string, values?: Record<string, unknown>) => string;

// A key that is not in the messages fails the test loudly, instead of the
// component and the test agreeing on "services.list.title".
function strict(namespace: string): Translate {
	const base = createTranslator({
		locale: "pt-BR",
		messages: getMessages("pt-BR"),
		namespace,
		onError: () => undefined,
		getMessageFallback: ({ namespace: ns, key }: never) =>
			`__MISSING__${ns}.${key}`,
	} as never) as unknown as Translate;
	return (key, values) => {
		const out = base(key, values);
		if (out.startsWith("__MISSING__"))
			throw new Error(`Missing copy key ${namespace}.${key}`);
		return out;
	};
}

/** The `services` messages (record-harness exports the same translator as `tServices`). */
export const ts = strict("services");
/** The `validation` messages. */
export const tv = strict("validation");

// ---------------------------------------------------------------- templates

export const SERVICE_ID = RECORD_ID;

/** The service system fields of the seeded template, labels as SPEC-0001 §3.2 amended ("Duração"). */
export function serviceSystemFields() {
	return [
		field({
			label: "Nome",
			type: "text",
			required: true,
			systemKey: "service.name",
		}),
		field({
			label: "Duração",
			type: "duration",
			required: true,
			systemKey: "service.duration",
		}),
		field({
			label: "Preço",
			type: "money",
			required: true,
			systemKey: "service.price",
		}),
	];
}

/** A service template: the system fields, then `customs`. */
export function serviceTemplate(
	customs: ReturnType<typeof field>[] = [],
	over: Partial<FormTemplate> = {},
	system = serviceSystemFields(),
): FormTemplate {
	return template({
		type: "service",
		name: "Serviço",
		fields: [...system, ...customs],
		...over,
	});
}

/** A service template as `GET /api/forms` lists it. */
export function serviceTemplateSummary(
	name: string,
	over: Partial<ReturnType<typeof summary>> = {},
) {
	return summary({ name, type: "service", ...over });
}

/** The service-template read behind the [Novo] menu and the Modelo control: `GET /api/forms?type=service`. */
export function serveServiceTemplates(
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

// ------------------------------------------------------------------ fixtures

/** A service as `GET /api/services/:id` returns it. */
export function service(over: Partial<ServiceResponse> = {}): ServiceResponse {
	return {
		id: SERVICE_ID,
		form: {
			id: FORM_ID,
			name: "Serviço",
			version: 1,
			latestVersion: 1,
			status: "active",
		},
		revision: 3,
		values: {},
		missingRequired: [],
		createdAt: "2026-11-01T12:00:00.000Z",
		updatedAt: "2026-11-01T12:00:00.000Z",
		name: "Sessão individual",
		durationMinutes: 90,
		priceCents: 15000,
		currency: "BRL",
		status: "active",
		hasHistory: false,
		...over,
	};
}

let rowSeq = 0;

/** A row of `GET /api/services`. */
export function serviceRow(
	name: string,
	over: Partial<ServiceSummary> = {},
): ServiceSummary {
	rowSeq += 1;
	return {
		id: `22222222-2222-4222-8222-${String(rowSeq).padStart(12, "0")}`,
		name,
		durationMinutes: 60,
		priceCents: 15000,
		currency: "BRL",
		formId: FORM_ID,
		formName: "Serviço",
		status: "active",
		updatedAt: "2026-11-01T12:00:00.000Z",
		hasHistory: false,
		...over,
	};
}

export type ListReply = {
	services: ServiceSummary[];
	nextCursor: string | null;
	total: number;
};

export const EMPTY_LIST: ListReply = {
	services: [],
	nextCursor: null,
	total: 0,
};

/** A reply; `total` defaults to the rows given (a single page). */
export function listReply(
	services: ServiceSummary[],
	nextCursor: string | null = null,
	total: number = services.length,
): ListReply {
	return { services, nextCursor, total };
}

/**
 * Serves `GET /api/services` from a fixed reply or a function of the query
 * (q, status, formId, sort, limit, after); a number is an error status.
 */
export function serveList(
	handler: ListReply | ((query: URLSearchParams) => ListReply | number),
) {
	on("GET", "/api/services", (call) => {
		const out = typeof handler === "function" ? handler(call.query) : handler;
		return typeof out === "number"
			? { status: out, body: { error: "unexpected" } }
			: { status: 200, body: out };
	});
}

export const servicePath = (id: string = SERVICE_ID) => `/api/services/${id}`;

/** Registers a handler that reads the current service from `box.current`. */
export function serveService(box: { current: ServiceResponse }) {
	on("GET", servicePath(box.current.id), () => ({
		status: 200,
		body: box.current,
	}));
}

// -------------------------------------------------------------- fake backend

export type BackendTemplate = {
	id: string;
	name: string;
	status: "active" | "archived";
};

export type Backend = {
	/** Mutable: the lifecycle routes change it. */
	services: ServiceSummary[];
	/** The tenant's service templates, active or archived. */
	templates: BackendTemplate[];
	/** Ids whose delete answers 409 `service.has-history` (history linked after the list was read). */
	historyOnDelete: Set<string>;
	/** What `GET /api/services/templates` does: answer, never answer, or fail with this status. */
	summary: "ok" | "never" | number;
};

export function backend(
	services: ServiceSummary[],
	templates: BackendTemplate[] = [
		{ id: FORM_ID, name: "Serviço", status: "active" },
	],
): Backend {
	return { services, templates, historyOnDelete: new Set(), summary: "ok" };
}

const fold = (text: string) =>
	text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
const compare = (a: string, b: string) => {
	const [x, y] = [fold(a), fold(b)];
	return x < y ? -1 : x > y ? 1 : 0;
};

const PAGE_SIZE = 50;

/** The `GET /api/services/templates` body for the current state. */
export function templateSummaryOf(b: Backend): ServiceTemplateSummary {
	const templates = b.templates
		.map((t) => ({
			...t,
			activeCount: b.services.filter(
				(s) => s.formId === t.id && s.status === "active",
			).length,
		}))
		.filter((t) => t.activeCount > 0)
		.sort((x, y) => compare(x.name, y.name));
	return {
		templates,
		archivedCount: b.services.filter((s) => s.status === "inactive").length,
	};
}

function fullService(b: Backend, row: ServiceSummary): ServiceResponse {
	const form = b.templates.find((t) => t.id === row.formId);
	return service({
		id: row.id,
		name: row.name,
		durationMinutes: row.durationMinutes,
		priceCents: row.priceCents,
		status: row.status,
		hasHistory: row.hasHistory,
		form: {
			id: row.formId,
			name: row.formName,
			version: 1,
			latestVersion: 1,
			status: form?.status ?? "active",
		},
	});
}

/**
 * Serves the whole service API from `b`: list (status, formId, q, sort, limit,
 * after; cursors "c50", "c100"), the template summary, and per service the
 * read, inactivate, reactivate and delete.
 */
export function serveBackend(b: Backend) {
	on("GET", "/api/services", (call) => {
		const { query } = call;
		const status = query.get("status") ?? "active";
		const formId = query.get("formId");
		const q = query.get("q");
		const sort = query.get("sort") ?? "name";
		let rows = b.services.filter(
			(s) =>
				status === "all" ||
				s.status === (status === "inactive" ? "inactive" : "active"),
		);
		if (formId) rows = rows.filter((s) => s.formId === formId);
		if (q) rows = rows.filter((s) => fold(s.name).includes(fold(q)));
		rows = [...rows].sort((x, y) => {
			if (sort === "form")
				return compare(x.formName, y.formName) || compare(x.name, y.name);
			if (sort === "-name") return compare(y.name, x.name);
			if (sort === "-updatedAt") return y.updatedAt.localeCompare(x.updatedAt);
			return compare(x.name, y.name);
		});
		const after = query.get("after");
		const start = after === null ? 0 : Number(after.slice(1));
		const limit = Number(query.get("limit") ?? PAGE_SIZE);
		const end = Math.min(start + limit, rows.length);
		return {
			status: 200,
			body: listReply(
				rows.slice(start, end),
				end < rows.length ? `c${end}` : null,
				rows.length,
			),
		};
	});

	on("GET", "/api/services/templates", () => {
		if (b.summary === "never") return new Promise(() => undefined);
		if (typeof b.summary === "number")
			return { status: b.summary, body: { error: "unexpected" } };
		return { status: 200, body: templateSummaryOf(b) };
	});

	for (const { id } of b.services) {
		const find = () => b.services.find((s) => s.id === id);
		const gone = { status: 404, body: { error: "service.not-found" } };

		on("GET", servicePath(id), () => {
			const row = find();
			return row ? { status: 200, body: fullService(b, row) } : gone;
		});

		for (const [action, from, to] of [
			["inactivate", "active", "inactive"],
			["reactivate", "inactive", "active"],
		] as const) {
			on("POST", `${servicePath(id)}/${action}`, () => {
				const row = find();
				if (!row) return gone;
				if (row.status !== from)
					return { status: 409, body: { error: "service.status-unchanged" } };
				row.status = to;
				row.updatedAt = new Date().toISOString();
				return { status: 200, body: fullService(b, row) };
			});
		}

		on("POST", `${servicePath(id)}/delete`, (call) => {
			const row = find();
			if (!row) return gone;
			const typed = (call.body as { confirmName?: string } | undefined)
				?.confirmName;
			if (typed?.trim() !== row.name)
				return { status: 400, body: { error: "deleteConfirmation.required" } };
			if (row.hasHistory || b.historyOnDelete.has(id))
				return { status: 409, body: { error: "service.has-history" } };
			b.services.splice(b.services.indexOf(row), 1);
			return { status: 204 };
		});
	}
}

// ---------------------------------------------------------------- DOM helpers

/** Pointer down then click: what a tap sends, for the menus that open on press. */
export function press(target: Element) {
	fireEvent.pointerDown(target);
	fireEvent.click(target);
}

/** The menu's items and dividers, in document order. */
export function menuEntries(menu: HTMLElement): string[] {
	return Array.from(
		menu.querySelectorAll('[role="menuitem"], [role="separator"]'),
	).map((el) =>
		el.getAttribute("role") === "separator"
			? "---"
			: (el.textContent ?? "").trim(),
	);
}

/** The row (wide) or card (narrow) of a service: the list item that shows the name. */
export function rowOf(name: string): HTMLElement {
	const row = screen
		.getAllByRole("listitem")
		.find((r) => within(r).queryByText(name));
	if (!row) throw new Error(`no row for ${name}`);
	return row;
}

/** The texts of an element's leaves, in order: badges and fields, no wrappers. */
export function leafTexts(el: HTMLElement): string[] {
	return Array.from(el.querySelectorAll("*"))
		.filter((e) => e.children.length === 0)
		.map((e) => (e.textContent ?? "").trim())
		.filter((text) => text !== "");
}

/** Text with every kind of space (the no-break space of "R$ 150,00" included) as one plain space. */
export const plain = (text: string | null | undefined) =>
	(text ?? "").replace(/\s+/g, " ").trim();
