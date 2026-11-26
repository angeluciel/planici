// Shared test harness for the SPEC-0008 web tests (app header, organization
// menu, account menu, navigation sheet). Builds on forms-harness: the BFF
// transport is faked at the axios adapter (PUT /api/tenants/active, GET
// /api/tenants, GET /api/auth/me) and at global fetch (DELETE
// /api/auth/session), and the shell runs with its real components and real
// messages. Tests go through the rendered shell and the network, not through
// the components' props.
//
// vi.mock calls are hoisted per file, so each test file repeats the three
// factories (axios adapter, @/i18n/navigation, next/navigation), as the other
// suites do.

import { getMessages } from "@planici/i18n";
import type { MeResponse, Tenant } from "@planici/schemas";
import {
	act,
	fireEvent,
	type RenderResult,
	render,
	screen,
	within,
} from "@testing-library/react";
import { AxiosError } from "axios";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { Component, type ReactNode } from "react";
import AppShell from "@/app/[lang]/(private)/orgs/_components/shell";
import { TenantGate } from "@/app/[lang]/(private)/orgs/[tenant]/tenant-gate";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { ThemeConsentSync } from "@/components/consent/theme-consent-sync";
import {
	createConsentRecord,
	DENY_ALL,
	THEME_STORAGE_KEY,
} from "@/lib/consent";
import { on, type Reply, router, routeState } from "./forms-harness";

export {
	calls,
	callsTo,
	i18nNavigationMock,
	installAxiosAdapter,
	navigatedTo,
	never,
	nextNavigationMock,
	on,
	type Reply,
	resetApi,
	router,
	routeState,
	stubFetch,
} from "./forms-harness";

// jsdom has no pointer capture; sonner calls it on a toast's pointer down.
for (const method of ["setPointerCapture", "releasePointerCapture"] as const) {
	if (!(method in Element.prototype)) {
		Object.defineProperty(Element.prototype, method, {
			configurable: true,
			value: () => undefined,
		});
	}
}

// ---------------------------------------------------------------- fixtures

export const ANA_ID = "studio-ana-4f9k2m7x1q";
export const BIA_ID = "clinica-bia-7h3n5p2w8r";
export const CAIO_ID = "espaco-caio-2b6d9f4k1t";
export const DUDA_ID = "atelie-duda-9c1e5a8g3j";

export function tenant(over: Partial<Tenant> & Pick<Tenant, "id" | "name">) {
	return {
		slug: over.id.replace(/-[0-9a-z]{10}$/, ""),
		status: "active",
		plan: "free",
		role: "owner",
		trialStartedAt: null,
		createdAt: "2026-09-01T12:00:00.000Z",
		...over,
	} satisfies Tenant;
}

/** "Studio Ana": the open organization, active. */
export const studioAna = tenant({ id: ANA_ID, name: "Studio Ana" });
/** "Clínica Bia": active. */
export const clinicaBia = tenant({ id: BIA_ID, name: "Clínica Bia" });
/** "Espaço Caio": suspended. */
export const espacoCaio = tenant({
	id: CAIO_ID,
	name: "Espaço Caio",
	status: "suspended",
});
/** "Ateliê Duda": owned by bia@example.com, not by ana@example.com. */
export const atelieDuda = tenant({ id: DUDA_ID, name: "Ateliê Duda" });

/** What `GET /api/tenants` answers for ana@example.com by default. */
export const anaTenants = (): Tenant[] => [studioAna, clinicaBia, espacoCaio];

export const ana: MeResponse = {
	id: "6f1c1e0e-3f5e-4a53-9a7c-0d6f7a1b2c3d",
	email: "ana@example.com",
	name: "Ana",
	surname: "Souza",
	slug: "ana-souza",
	displayName: "Ana Souza",
	avatarUrl: null,
	emailVerified: true,
};

/** The page the tests start on: the client list of "Studio Ana". */
export const CLIENTS_PATH = `/orgs/${ANA_ID}/clients`;

// ------------------------------------------------------------- the fake API

export const SELECT = ["PUT", "/api/tenants/active"] as const;
export const LIST = ["GET", "/api/tenants"] as const;
export const ME = ["GET", "/api/auth/me"] as const;
export const REFRESH = ["POST", "/api/auth/refresh"] as const;
export const SIGN_OUT = ["DELETE", "/api/auth/session"] as const;

/** A route handler for a server that cannot be reached: an axios error with no response. */
export const networkDown = (): Reply => {
	throw new AxiosError("Network Error", "ERR_NETWORK");
};

/** A 500 `unexpected` reply. */
export const unexpected: Reply = {
	status: 500,
	body: { error: "unexpected" },
};

/** Makes a session endpoint answer 401 and the session renewal fail too: the session cannot be renewed. */
export function expireSession(method: string, path: string) {
	on(method, path, { status: 401, body: { error: "session.expired" } });
	on("POST", "/api/auth/refresh", {
		status: 401,
		body: { error: "session.expired" },
	});
}

/**
 * The server as a signed-in ana@example.com sees it: her organizations, her
 * e-mail, a selection that checks membership and status, and a sign-out that
 * answers 204. Call it after `resetApi()` and before the page mounts; tests
 * override single routes with `on` afterwards (the latest registration wins).
 */
export function serveShell(
	options: { tenants?: Tenant[]; me?: MeResponse } = {},
) {
	const tenants = options.tenants ?? anaTenants();
	on(...LIST, () => ({ status: 200, body: { tenants } }));
	on(...ME, { status: 200, body: options.me ?? ana });
	on(...SELECT, (call) => {
		const id = (call.body as { tenantId?: string } | undefined)?.tenantId;
		const found = tenants.find((t) => t.id === id);
		if (!found) return { status: 404, body: { error: "tenant.not-found" } };
		if (found.status !== "active")
			return { status: 403, body: { error: "tenant.inactive" } };
		return { status: 200, body: found };
	});
	on(...SIGN_OUT, { status: 204 });
}

// -------------------------------------------------------------- screen media
// The shell reads window.matchMedia("(min-width: 48rem)") and next-themes reads
// "(prefers-color-scheme: dark)". jsdom has no matchMedia. This stub answers
// min-width / max-width in px and in rem (1rem = 16px) for a settable width, and
// the colour scheme for a settable device theme, and fires `change` listeners
// when either changes (SPEC-0008 AC-0008-39). It is a property override, not
// vi.stubGlobal, because the suites call vi.unstubAllGlobals() after each test;
// call resetShell() in afterEach.

export const NARROW = 375;
export const TABLET = 1024;
export const WIDE = 1280;

const REM_PX = 16;

let viewportWidth = WIDE;
let deviceDark = false;
let mediaInstalled = false;
let originalMatchMedia: PropertyDescriptor | undefined;

type FakeList = {
	media: string;
	last: boolean;
	listeners: Set<(event: { matches: boolean; media: string }) => void>;
};
const fakeLists = new Set<FakeList>();

function pxOf(value: string, unit: string): number {
	return Number(value) * (unit === "rem" ? REM_PX : 1);
}

function evaluate(query: string): boolean {
	const scheme = /\(\s*prefers-color-scheme:\s*(dark|light)\s*\)/.exec(query);
	if (scheme) return (scheme[1] === "dark") === deviceDark;
	const min = /\(\s*min-width:\s*(\d+(?:\.\d+)?)(px|rem)\s*\)/.exec(query);
	if (min?.[1] && min[2]) return viewportWidth >= pxOf(min[1], min[2]);
	const max = /\(\s*max-width:\s*(\d+(?:\.\d+)?)(px|rem)\s*\)/.exec(query);
	if (max?.[1] && max[2]) return viewportWidth <= pxOf(max[1], max[2]);
	return false;
}

function notifyMedia() {
	act(() => {
		for (const list of fakeLists) {
			const now = evaluate(list.media);
			if (now === list.last) continue;
			list.last = now;
			for (const listener of [...list.listeners]) {
				listener({ matches: now, media: list.media });
			}
		}
	});
}

function installMedia() {
	if (mediaInstalled) return;
	originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
	mediaInstalled = true;
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: (query: string) => {
			const state: FakeList = {
				media: query,
				last: evaluate(query),
				listeners: new Set(),
			};
			fakeLists.add(state);
			return {
				get matches() {
					return evaluate(query);
				},
				media: query,
				onchange: null,
				addEventListener: (type: string, listener: never) => {
					if (type === "change") state.listeners.add(listener);
				},
				removeEventListener: (type: string, listener: never) => {
					if (type === "change") state.listeners.delete(listener);
				},
				addListener: (listener: never) => state.listeners.add(listener),
				removeListener: (listener: never) => state.listeners.delete(listener),
				dispatchEvent: () => false,
			};
		},
	});
}

/** Sets the viewport width (375 narrow, 1024, 1280 wide) and fires `change` where the answer flips. */
export function setViewport(width: number) {
	installMedia();
	viewportWidth = width;
	notifyMedia();
}

/** Sets the device's colour scheme and fires `change` where the answer flips. */
export function setDeviceTheme(theme: "dark" | "light") {
	installMedia();
	deviceDark = theme === "dark";
	notifyMedia();
}

/** Puts matchMedia, the device theme, the stored theme and the document's theme back. Call in afterEach. */
export function resetShell() {
	viewportWidth = WIDE;
	deviceDark = false;
	fakeLists.clear();
	if (mediaInstalled) {
		mediaInstalled = false;
		if (originalMatchMedia) {
			Object.defineProperty(window, "matchMedia", originalMatchMedia);
		} else {
			Reflect.deleteProperty(window, "matchMedia");
		}
		originalMatchMedia = undefined;
	}
	try {
		window.localStorage.clear();
	} catch {
		// nothing
	}
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.removeProperty("color-scheme");
	router.push.mockReset();
	routeState.pathname = "";
	routeState.params = {};
}

// --------------------------------------------------------------- rendering

class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
	state: { error?: Error } = {};
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	render() {
		return this.state.error ? this.state.error.message : this.props.children;
	}
}

export type ShellOptions = {
	/** The organization in the address. Default: Studio Ana. */
	tenantId?: string;
	locale?: "pt-BR" | "en-US";
	/** Viewport width in px. Default: whatever setViewport last set (1280). */
	width?: number;
	/** Whether the user allowed "preferências" cookies. Default: refused. */
	preferences?: boolean;
};

function tree(options: ShellOptions, tenantId: string): ReactNode {
	const locale = options.locale ?? "pt-BR";
	const record = createConsentRecord({
		...DENY_ALL,
		preferences: options.preferences ?? false,
	});
	return (
		<ThemeProvider
			attribute="data-theme"
			defaultTheme="system"
			storageKey={THEME_STORAGE_KEY}
			enableSystem
		>
			<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
				<ConsentProvider initial={record}>
					<ThemeConsentSync />
					<Boundary>
						<TenantGate tenantId={tenantId}>
							<AppShell>
								<p>page</p>
							</AppShell>
						</TenantGate>
					</Boundary>
				</ConsentProvider>
			</NextIntlClientProvider>
		</ThemeProvider>
	);
}

function pointRouteAt(tenantId: string, path?: string) {
	routeState.params = { lang: "pt-BR", tenant: tenantId };
	routeState.pathname = path ?? `/orgs/${tenantId}/clients`;
}

export type ShellRender = RenderResult & {
	/** What the address bar does after a navigation: the page for another organization mounts. */
	changeTenant: (tenantId: string) => void;
};

/**
 * Mounts the page the way the app does: theme, messages, consent, then the
 * gate for the organization in the address and the shell around a page.
 * `router.push("/orgs/<id>/...")` is followed: the tree is re-rendered for that
 * organization, as the real navigation would mount the new page's gate.
 */
export function renderShell(options: ShellOptions = {}): ShellRender {
	if (options.width !== undefined) setViewport(options.width);
	else installMedia();
	const tenantId = options.tenantId ?? ANA_ID;
	pointRouteAt(tenantId);

	const result = render(tree(options, tenantId));
	const changeTenant = (next: string) => {
		pointRouteAt(next);
		act(() => result.rerender(tree(options, next)));
	};
	router.push.mockImplementation((href: unknown) => {
		const match =
			typeof href === "string" ? /^\/orgs\/([^/]+)(?:\/|$)/.exec(href) : null;
		if (match?.[1]) changeTenant(match[1]);
	});
	return Object.assign(result, { changeTenant });
}

// -------------------------------------------------------------- DOM helpers

/** Pointer down then click: what a tap sends, for the menus that open on press. */
export function press(target: Element) {
	fireEvent.pointerDown(target);
	fireEvent.click(target);
}

/** Escape as a person presses it. */
export function pressEscape(target: Element) {
	fireEvent.keyDown(target, { key: "Escape", code: "Escape" });
	fireEvent.keyUp(target, { key: "Escape", code: "Escape" });
}

/** The header (role banner), once the gate has confirmed the organization. */
export const findHeader = () => screen.findByRole("banner");

export const headerOf = (): HTMLElement => screen.getByRole("banner");

export const orgLink = (name: string) =>
	within(headerOf()).getByRole("link", {
		name: `${name}, ver todas as organizações`,
	});

export const orgTrigger = () =>
	within(headerOf()).getByRole("button", { name: "Trocar organização" });

export const accountTrigger = () =>
	within(headerOf()).getByRole("button", { name: "Menu da conta" });

/** True when `a` comes before `b` in document order. */
export function before(a: Node, b: Node): boolean {
	return Boolean(
		a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
	);
}

/** The navigations the router received, as strings. */
function targets(): string[] {
	return [...router.push.mock.calls, ...router.replace.mock.calls].map(
		(args) => (typeof args[0] === "string" ? args[0] : JSON.stringify(args[0])),
	);
}

/** True when the router was sent to the sign-in page returning to `next` (object or query-string form). */
export function wentToSignInFor(next: string): boolean {
	return targets().some((target) => {
		if (target.startsWith("{")) {
			const parsed = JSON.parse(target) as {
				pathname?: string;
				query?: { next?: string };
			};
			return parsed.pathname === "/login" && parsed.query?.next === next;
		}
		const url = new URL(target, "http://localhost");
		return url.pathname === "/login" && url.searchParams.get("next") === next;
	});
}

/** True when the router was sent to the plain sign-in page. */
export function wentToSignIn(): boolean {
	return targets().some((target) => {
		if (target.startsWith("{")) {
			return (
				(JSON.parse(target) as { pathname?: string }).pathname === "/login"
			);
		}
		return new URL(target, "http://localhost").pathname === "/login";
	});
}
