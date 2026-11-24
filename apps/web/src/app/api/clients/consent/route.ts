import { getMessages, type Locale, locales } from "@planici/i18n";
import {
	CLIENT_CONSENT_TEXT_VERSION,
	type ClientConsentText,
	ClientConsentTextSchema,
} from "@planici/schemas";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { route } from "../../_lib/http";

const DEFAULT_LOCALE: Locale = "pt-BR";

function isLocale(value: string | undefined): value is Locale {
	return locales.some((locale) => locale === value);
}

// next-intl keeps the page locale in NEXT_LOCALE; the browser's language is the
// fallback; the proxy does not run for /api
function requestLocale(request: NextRequest): Locale {
	const cookie = request.cookies.get("NEXT_LOCALE")?.value;
	if (isLocale(cookie)) return cookie;

	const accepted = (request.headers.get("accept-language") ?? "")
		.split(",")
		.map((part) => part.split(";")[0]?.trim() ?? "");
	for (const tag of accepted) {
		const exact = locales.find((l) => l.toLowerCase() === tag.toLowerCase());
		if (exact) return exact;
		const language = tag.split("-")[0]?.toLowerCase();
		const byLanguage = locales.find(
			(l) => l.split("-")[0]?.toLowerCase() === language,
		);
		if (byLanguage) return byLanguage;
	}
	return DEFAULT_LOCALE;
}

// GET /api/clients/consent: the attestation text of the deployed code, in the
// request's locale, with its version (SPEC-0004 R12, Decision 5)
export const GET = route(async (request) => {
	const messages = getMessages(requestLocale(request));
	const body: ClientConsentText = ClientConsentTextSchema.parse({
		version: CLIENT_CONSENT_TEXT_VERSION,
		text: messages.clients.form.consent,
	});

	return NextResponse.json(body);
});
