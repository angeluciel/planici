"use client";

import { useTranslations } from "next-intl";
import { useConsent } from "./consent-provider";

export function CookieSettingsLink({
	className,
}: Readonly<{ className?: string }>) {
	const t = useTranslations("consent");
	const { openPreferences } = useConsent();

	return (
		<button type="button" onClick={openPreferences} className={className}>
			{t("settings-link")}
		</button>
	);
}
