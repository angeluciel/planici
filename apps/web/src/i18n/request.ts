import { getMessages } from "@planici/i18n";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale: overrideLocale }) => {
	const requested = overrideLocale ?? (await rootParams.lang());

	const locale = hasLocale(routing.locales, requested)
		? requested
		: routing.defaultLocale;

	return {
		locale,
		messages: getMessages(locale),
	};
});
