// Shared test harness for SPEC-0001 web tests (W-list, W-ed, W-dlg).
// Network is faked at the transport boundary: the axios adapter (the existing
// session clients are axios based) and global fetch, so the tests do not care
// which one `src/lib/api/forms.ts` ends up using.

import { getMessages } from "@planici/i18n";
import type {
	Field,
	FormChangePreviewResponse,
	FormTemplate,
	FormTemplateSummary,
} from "@planici/schemas";
import { type RenderResult, render } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { createElement, type ReactNode } from "react";
import { type Mock, vi } from "vitest";

export const TENANT = "studio-ana-4f9k2m7x1q";
export const FORM_ID = "6f1c1e0e-3f5e-4a53-9a7c-0d6f7a1b2c3d";

const messages = getMessages("pt-BR");
export const t = createTranslator({
	locale: "pt-BR",
	messages,
	namespace: "forms",
} as never) as unknown as (
	key: string,
	values?: Record<string, unknown>,
) => string;
export const tCommon = createTranslator({
	locale: "pt-BR",
	messages,
	namespace: "common",
} as never) as unknown as (
	key: string,
	values?: Record<string, unknown>,
) => string;

// ---------------------------------------------------------------- fake API

export type Call = {
	method: string;
	path: string;
	query: URLSearchParams;
	body: unknown;
};
export type Reply = { status: number; body?: unknown };
type Handler = Reply | ((call: Call) => Reply | Promise<Reply>);
type Route = { method: string; path: string; handler: Handler };

export const calls: Call[] = [];
let routes: Route[] = [];

export function resetApi() {
	calls.length = 0;
	routes = [];
}

/** Registers a reply for `METHOD /path`. The latest registration wins. */
export function on(method: string, path: string, handler: Handler) {
	routes.unshift({ method, path, handler });
}

export const never = (): Promise<Reply> => new Promise(() => undefined);

export function callsTo(method: string, path: string) {
	return calls.filter((c) => c.method === method && c.path === path);
}

async function dispatch(
	method: string,
	rawUrl: string,
	params: unknown,
	data: unknown,
): Promise<Reply> {
	const url = new URL(rawUrl, "http://localhost");
	if (params && typeof params === "object") {
		for (const [k, v] of Object.entries(params)) {
			if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
		}
	}
	let body: unknown = data;
	if (typeof data === "string" && data.length > 0) {
		try {
			body = JSON.parse(data);
		} catch {
			body = data;
		}
	}
	const call: Call = {
		method: method.toUpperCase(),
		path: url.pathname.replace(/\/$/, ""),
		query: url.searchParams,
		body,
	};
	calls.push(call);
	const route = routes.find(
		(r) => r.method === call.method && r.path === call.path,
	);
	if (!route) return { status: 501, body: { error: "unmocked" } };
	return typeof route.handler === "function"
		? route.handler(call)
		: route.handler;
}

export function installAxiosAdapter(
	instance: { defaults: { adapter?: unknown } },
	AxiosErrorCtor: new (...args: never[]) => Error,
) {
	instance.defaults.adapter = async (config: {
		baseURL?: string;
		url?: string;
		method?: string;
		params?: unknown;
		data?: unknown;
		validateStatus?: (status: number) => boolean;
	}) => {
		const base = (config.baseURL ?? "").replace(/\/$/, "");
		const url = /^https?:/.test(config.url ?? "")
			? (config.url as string)
			: `${base}${config.url ?? ""}`;
		const reply = await dispatch(
			config.method ?? "get",
			url,
			config.params,
			config.data,
		);
		const response = {
			data: reply.body ?? "",
			status: reply.status,
			statusText: "",
			headers: {},
			config,
			request: {},
		};
		const ok = config.validateStatus
			? config.validateStatus(reply.status)
			: reply.status >= 200 && reply.status < 300;
		if (ok) return response;
		throw new (AxiosErrorCtor as unknown as new (...args: unknown[]) => Error)(
			`Request failed with status code ${reply.status}`,
			reply.status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
			config,
			{},
			response,
		);
	};
}

export function stubFetch() {
	vi.stubGlobal(
		"fetch",
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			const reply = await dispatch(
				init?.method ?? "GET",
				url,
				undefined,
				init?.body,
			);
			const noBody = reply.status === 204 || reply.body === undefined;
			return new Response(noBody ? null : JSON.stringify(reply.body), {
				status: reply.status,
				headers: { "content-type": "application/json" },
			});
		},
	);
}

// ------------------------------------------------------ navigation mocking

export const router: Record<
	"push" | "replace" | "back" | "forward" | "refresh" | "prefetch",
	Mock
> = {
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
};

export const routeState: {
	params: Record<string, string>;
	search: string;
	pathname: string;
} = { params: {}, search: "", pathname: "" };

export function setRoute(opts: {
	formId?: string;
	search?: string;
	pathname?: string;
}) {
	routeState.params = {
		lang: "pt-BR",
		tenant: TENANT,
		...(opts.formId ? { formId: opts.formId } : {}),
	};
	routeState.search = opts.search ?? "";
	routeState.pathname =
		opts.pathname ??
		`/orgs/${TENANT}/forms${opts.formId ? `/${opts.formId}` : ""}`;
}

function hrefOf(href: unknown): string {
	if (typeof href === "string") return href;
	if (href && typeof href === "object" && "pathname" in href)
		return String((href as { pathname: unknown }).pathname);
	return "";
}

export function i18nNavigationMock(): Record<string, unknown> {
	return {
		Link: ({
			href,
			children,
			...rest
		}: { href: unknown; children?: ReactNode } & Record<string, unknown>) =>
			createElement("a", { ...rest, href: hrefOf(href) }, children),
		useRouter: () => router,
		usePathname: () => routeState.pathname,
		redirect: vi.fn(),
		getPathname: vi.fn(),
	};
}

export function nextNavigationMock(): Record<string, unknown> {
	return {
		useRouter: () => router,
		usePathname: () => routeState.pathname,
		useParams: () => routeState.params,
		useSearchParams: () => new URLSearchParams(routeState.search),
		notFound: () => {
			throw new Error("NEXT_NOT_FOUND");
		},
		redirect: vi.fn(),
	};
}

/** Flattens whatever the router received (string or { pathname, query }). */
export function navigatedTo(): string[] {
	return [...router.push.mock.calls, ...router.replace.mock.calls].map(
		(args) => (typeof args[0] === "string" ? args[0] : JSON.stringify(args[0])),
	);
}

// --------------------------------------------------------------- rendering

// The toast provider is mounted by the org shell in production; tests mount it
// if the module exports one so toasts can be read from the document.
const toastModules = import.meta.glob("../src/components/ui/toast.tsx", {
	eager: true,
}) as Record<string, Record<string, unknown>>;
const ToastProvider = Object.values(toastModules)[0]?.ToastProvider as
	| React.ComponentType<{ children: ReactNode }>
	| undefined;

export function renderApp(ui: ReactNode): RenderResult {
	const inner = ToastProvider ? createElement(ToastProvider, null, ui) : ui;
	return render(
		<NextIntlClientProvider locale="pt-BR" messages={messages}>
			{inner}
		</NextIntlClientProvider>,
	);
}

// ---------------------------------------------------------------- fixtures

let seq = 0;
const nextId = () =>
	`00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

export function field(
	over: Partial<Field> & Pick<Field, "label" | "type">,
): Field {
	return {
		id: nextId(),
		required: false,
		sensitive: false,
		sensitiveLock: null,
		requiredLock: false,
		helpText: null,
		options: null,
		systemKey: null,
		valueCount: 0,
		...over,
	};
}

export function clientFields(): Field[] {
	return [
		field({
			label: "Nome completo",
			type: "full_name",
			required: true,
			requiredLock: true,
			systemKey: "client.name",
		}),
		field({
			label: "E-mail",
			type: "email",
			required: true,
			requiredLock: true,
			systemKey: "client.email",
		}),
		field({ label: "Telefone", type: "phone", systemKey: "client.phone" }),
	];
}

export function template(over: Partial<FormTemplate> = {}): FormTemplate {
	return {
		id: FORM_ID,
		type: "client",
		name: "Ficha",
		description: null,
		status: "active",
		version: 1,
		revision: 1,
		recordCount: 0,
		recordsOnOlderVersions: 0,
		recordsWithHistory: 0,
		fields: clientFields(),
		createdAt: "2026-11-01T12:00:00.000Z",
		updatedAt: "2026-11-01T12:00:00.000Z",
		...over,
	};
}

export function summary(
	over: Partial<FormTemplateSummary> & Pick<FormTemplateSummary, "name">,
): FormTemplateSummary {
	return {
		id: nextId(),
		type: "client",
		description: null,
		status: "active",
		version: 1,
		fieldCount: 3,
		recordCount: 0,
		recordsWithHistory: 0,
		updatedAt: "2026-11-01T12:00:00.000Z",
		...over,
	};
}

export function preview(
	over: Partial<FormChangePreviewResponse> = {},
): FormChangePreviewResponse {
	return {
		schemaChanged: false,
		nextVersion: 2,
		recordCount: 0,
		recordsLosingAnswers: 0,
		recordsGainingRequiredFields: 0,
		added: [],
		removed: [],
		changed: [],
		...over,
	};
}

/** Registers GET /api/forms/:id (and optionally more) for one template. */
export function serveTemplate(tpl: FormTemplate) {
	on("GET", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
}
