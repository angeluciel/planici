"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "../button";
import { useConsent } from "./consent-provider";
import { PreferencesDialog } from "./preferences-dialog";

export function CookieBanner() {
	const t = useTranslations("consent.banner");
	const { hasChosen, acceptAll, rejectAll, openPreferences } = useConsent();

	return (
		<>
			{!hasChosen && (
				<section
					aria-label={t("title")}
					className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4"
				>
					<div className="flex w-full max-w-3xl flex-col gap-3 rounded-md border-2 border-border-input bg-surface-overlay p-4 shadow-overlay">
						<div className="flex flex-col gap-1">
							<h2 className="font-heading-xs text-text-primary">
								{t("title")}
							</h2>
							<p className="font-body-sm text-text-secondary">
								{t("description")}{" "}
								<Link
									href="/privacy"
									className="text-text-link hover:text-text-link-pressed visited:text-text-link-visited"
								>
									{t("policy-link")}
								</Link>
							</p>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								text={t("customize")}
								variant="subtle"
								onPress={openPreferences}
								className="sm:w-auto sm:px-4"
							/>
							<Button
								text={t("reject-all")}
								variant="secondary"
								onPress={rejectAll}
								className="sm:w-auto sm:px-4"
							/>
							<Button
								text={t("accept-all")}
								variant="primary"
								onPress={acceptAll}
								className="sm:w-auto sm:px-4"
							/>
						</div>
					</div>
				</section>
			)}
			<PreferencesDialog />
		</>
	);
}
