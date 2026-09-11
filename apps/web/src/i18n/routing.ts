import { locales } from "@planici/i18n";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	locales,
	defaultLocale: "pt-BR",
});
