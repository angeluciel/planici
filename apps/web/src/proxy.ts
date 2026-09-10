import { type NextRequest, NextResponse, type ProxyConfig } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

interface JwtPayload {
	sub: string;
	iat: number;
	exp?: number;
}

const publicRoutes = [
	{ path: "/login", whenAuthenticated: "redirect" },
	{ path: "/register", whenAuthenticated: "redirect" },
	{ path: "/forgot-password", whenAuthenticated: "redirect" },
	{ path: "/reset-password", whenAuthenticated: "redirect" },
	{ path: "/terms", whenAuthenticated: "allow" },
	{ path: "/privacy", whenAuthenticated: "allow" },
] as const;

const PROTECTED_PREFIXES = ["/dashboard", "/profile"] as const;

const REDIRECT_WHEN_NOT_AUTHENTICATED = "/login";
const REDIRECT_WHEN_AUTHENTICATED = "/dashboard";

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(
		base64.length + ((4 - (base64.length % 4)) % 4),
		"=",
	);
	return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function verifyJwt(token: string): Promise<JwtPayload | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split(".");
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		const secret = process.env.JWT_SECRET;
		if (!secret) throw new Error("JWT_SECRET is not set.");

		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["verify"],
		);

		const valid = await crypto.subtle.verify(
			"HMAC",
			cryptoKey,
			fromBase64Url(signatureB64),
			new TextEncoder().encode(`${headerB64}.${payloadB64}`),
		);
		if (!valid) return null;

		const rawPayload: unknown = JSON.parse(
			new TextDecoder().decode(fromBase64Url(payloadB64)),
		);
		const payload = rawPayload as JwtPayload;

		if (payload.exp && Date.now() > payload.exp * 1000) return null;

		return payload;
	} catch {
		return null;
	}
}

// W3C Trace Context Helpers (T-017 / AL-08)

function generateTraceId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateTraceId(request: NextRequest): string {
	const traceparent = request.headers.get("traceparent");
	if (!traceparent) return generateTraceId();

	const parts = traceparent.split("-");
	if (parts.length !== 4) return generateTraceId();
	if (parts[1]?.length !== 32) return generateTraceId();

	return parts[1];
}

function splitLocale(pathname: string): {
	locale: string | null;
	rest: string;
} {
	for (const locale of routing.locales) {
		if (pathname === `/${locale}`) return { locale, rest: "/" };
		if (pathname.startsWith(`/${locale}/`)) {
			return { locale, rest: pathname.slice(locale.length + 1) };
		}
	}
	return { locale: null, rest: pathname };
}

function withLocale(locale: string, path: string): string {
	return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const traceId = getOrCreateTraceId(request);
	const withTrace = (res: NextResponse): NextResponse => {
		res.headers.set("x-trace-id", traceId);
		return res;
	};

	const { locale: pathLocale, rest } = splitLocale(pathname);
	const locale = pathLocale ?? routing.defaultLocale;

	const publicRoute = publicRoutes.find((r) => r.path === rest);

	const isProtected =
		!publicRoute &&
		PROTECTED_PREFIXES.some(
			(prefix) => rest === prefix || rest.startsWith(`${prefix}/`),
		);

	const tokenCookie = request.cookies.get("token");
	let session: JwtPayload | null = null;

	if (tokenCookie?.value) {
		session = await verifyJwt(tokenCookie.value);

		if (!session) {
			const res = NextResponse.redirect(
				new URL(REDIRECT_WHEN_NOT_AUTHENTICATED, request.url),
			);
			res.cookies.delete("token");
			return withTrace(res);
		}
	}

	// routing logic
	if (rest === "/") {
		const dest = session
			? REDIRECT_WHEN_AUTHENTICATED
			: REDIRECT_WHEN_NOT_AUTHENTICATED;
		return withTrace(
			NextResponse.redirect(new URL(withLocale(locale, dest), request.url)),
		);
	}

	if (isProtected && !session) {
		const url = new URL(
			withLocale(locale, REDIRECT_WHEN_NOT_AUTHENTICATED),
			request.url,
		);
		url.searchParams.set("next", rest);
		return withTrace(NextResponse.redirect(url));
	}

	if (publicRoute?.whenAuthenticated === "redirect" && session) {
		return withTrace(
			NextResponse.redirect(
				new URL(withLocale(locale, REDIRECT_WHEN_AUTHENTICATED), request.url),
			),
		);
	}

	return withTrace(intlMiddleware(request));
}

export const config: ProxyConfig = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
	],
};
