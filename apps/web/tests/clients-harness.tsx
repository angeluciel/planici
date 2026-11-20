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

import { getMessages } from "@planici/i18n";
import type { ClientResponse, ClientSummary } from "@planici/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, type RenderResult, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { createQueryClient } from "@/lib/query/query-provider";
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
		updatedAt: "2026-11-01T12:00:00.000Z",
		...over,
	};
}

export type ListReply = {
	clients: ClientSummary[];
	nextCursor: string | null;
	total: number;
};

export const EMPTY_LIST: ListReply = {
	clients: [],
	nextCursor: null,
	total: 0,
};

/** A reply; `total` defaults to the rows given (a single page). */
export function listReply(
	clients: ClientSummary[],
	nextCursor: string | null = null,
	total: number = clients.length,
): ListReply {
	return { clients, nextCursor, total };
}

/**
 * Serves `GET /api/clients`; the handler sees the whole query: q, status,
 * formId, sort, limit and after.
 */
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

// ------------------------------------------------------------- rendering

const messages = getMessages("pt-BR");

/**
 * Renders the page inside a QueryClientProvider whose client comes from the
 * app's `createQueryClient()` (no test-only defaults), the pt-BR messages with
 * `timeZone="UTC"` (the server's zone) and the toast provider. Pass `client`
 * to remount under the same cache.
 */
export function renderClients(
	ui: ReactNode,
	{ client: queryClient }: { client?: QueryClient } = {},
): RenderResult & { client: QueryClient } {
	const qc = queryClient ?? createQueryClient();
	const result = render(
		<QueryClientProvider client={qc}>
			<NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="UTC">
				<ToastProvider>{ui}</ToastProvider>
			</NextIntlClientProvider>
		</QueryClientProvider>,
	);
	return Object.assign(result, { client: qc });
}

// ------------------------------------------------------------ screen width
// `(min-width: 768px)` decides the layout (SPEC-0006 G-2). Unlike forms-harness'
// setScreen, calling this again fires `change` on the live queries, so a mounted
// page sees the screen narrow or widen. Call restoreClientsScreen() in afterEach.

type Listener = (event: { matches: boolean; media: string }) => void;

const NARROW_PX = 600;
const WIDE_PX = 1280;
let clientsScreenWidth = WIDE_PX;
let clientsScreenOverridden = false;
let originalMatchMedia: PropertyDescriptor | undefined;
const mediaListeners = new Set<{ query: string; listener: Listener }>();

function queryMatches(query: string, width: number): boolean {
	const min = /\(\s*min-width:\s*(\d+(?:\.\d+)?)px\s*\)/.exec(query);
	if (min) return width >= Number(min[1]);
	const max = /\(\s*max-width:\s*(\d+(?:\.\d+)?)px\s*\)/.exec(query);
	if (max) return width <= Number(max[1]);
	return false;
}

export function setClientsScreen(size: "narrow" | "wide") {
	const before = clientsScreenWidth;
	clientsScreenWidth = size === "narrow" ? NARROW_PX : WIDE_PX;
	if (!clientsScreenOverridden) {
		originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
		clientsScreenOverridden = true;
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			writable: true,
			value: (query: string) => {
				const registered = new Map<
					Listener,
					{ query: string; listener: Listener }
				>();
				return {
					get matches() {
						return queryMatches(query, clientsScreenWidth);
					},
					media: query,
					onchange: null,
					addEventListener: (type: string, listener: Listener) => {
						if (type !== "change") return;
						const entry = { query, listener };
						registered.set(listener, entry);
						mediaListeners.add(entry);
					},
					removeEventListener: (type: string, listener: Listener) => {
						if (type !== "change") return;
						const entry = registered.get(listener);
						if (entry) mediaListeners.delete(entry);
						registered.delete(listener);
					},
					addListener: () => undefined,
					removeListener: () => undefined,
					dispatchEvent: () => false,
				};
			},
		});
	}
	for (const { query, listener } of [...mediaListeners]) {
		const was = queryMatches(query, before);
		const now = queryMatches(query, clientsScreenWidth);
		if (was !== now) {
			act(() => listener({ matches: now, media: query }));
		}
	}
}

export function restoreClientsScreen() {
	mediaListeners.clear();
	clientsScreenWidth = WIDE_PX;
	if (!clientsScreenOverridden) return;
	clientsScreenOverridden = false;
	if (originalMatchMedia) {
		Object.defineProperty(window, "matchMedia", originalMatchMedia);
	} else {
		Reflect.deleteProperty(window, "matchMedia");
	}
	originalMatchMedia = undefined;
}

// -------------------------------------------------------- IntersectionObserver

type FakeObserver = {
	callback: IntersectionObserverCallback;
	observed: Set<Element>;
};

/**
 * Replaces IntersectionObserver (vi.stubGlobal; the suites unstub in
 * afterEach). `revealLast()` reports, as in view, the last connected element
 * (in document order) that any live observer watches.
 */
export function stubIntersection() {
	const observers = new Set<FakeObserver>();
	class Fake {
		private readonly state: FakeObserver;
		readonly root = null;
		readonly rootMargin = "0px";
		readonly thresholds = [0];
		constructor(callback: IntersectionObserverCallback) {
			this.state = { callback, observed: new Set() };
			observers.add(this.state);
		}
		observe(el: Element) {
			this.state.observed.add(el);
		}
		unobserve(el: Element) {
			this.state.observed.delete(el);
		}
		disconnect() {
			this.state.observed.clear();
			observers.delete(this.state);
		}
		takeRecords() {
			return [];
		}
	}
	vi.stubGlobal("IntersectionObserver", Fake);
	return {
		/** Returns false, and reports nothing, when no element is observed. */
		revealLast(): boolean {
			let last: { el: Element; owner: FakeObserver } | null = null;
			for (const owner of observers) {
				for (const el of owner.observed) {
					if (!el.isConnected) continue;
					if (
						!last ||
						last.el.compareDocumentPosition(el) &
							Node.DOCUMENT_POSITION_FOLLOWING
					) {
						last = { el, owner };
					}
				}
			}
			if (!last) return false;
			const { el, owner } = last;
			act(() => {
				owner.callback(
					[
						{
							target: el,
							isIntersecting: true,
							intersectionRatio: 1,
							boundingClientRect: el.getBoundingClientRect(),
							intersectionRect: el.getBoundingClientRect(),
							rootBounds: null,
							time: 0,
						} as IntersectionObserverEntry,
					],
					owner as unknown as IntersectionObserver,
				);
			});
			return true;
		},
	};
}

// -------------------------------------------------------- scroll and time zone

/** Spies on window.scrollTo (jsdom has none that works); restore in afterEach. */
export function spyScrollTo() {
	return vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
}

let originalTz: string | undefined;
let tzSet = false;

/** Sets the browser's zone through TZ and checks that Intl follows it. */
export function setBrowserZone(zone: string) {
	if (!tzSet) {
		originalTz = process.env.TZ;
		tzSet = true;
	}
	process.env.TZ = zone;
	const seen = Intl.DateTimeFormat().resolvedOptions().timeZone;
	if (seen !== zone) {
		throw new Error(`Intl did not follow TZ=${zone} (resolved ${seen})`);
	}
}

export function restoreBrowserZone() {
	if (!tzSet) return;
	tzSet = false;
	if (originalTz === undefined) {
		Reflect.deleteProperty(process.env, "TZ");
	} else {
		process.env.TZ = originalTz;
	}
}
