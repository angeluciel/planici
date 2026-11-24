"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

export default function NotFound() {
	const t = useTranslations("not-found");

	const router = useRouter();

	const handleBack = () => {
		if (window.history.length > 1) {
			router.back();
		} else {
			router.replace(`/@me`);
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center gap-4 p-6 text-center bg-surface text-text-primary">
			<h1 className="font-heading-lg text-text-status-danger">404</h1>
			<h2 className="font-heading-md">{t("h2")}</h2>
			<span className="text-text-secondary">{t("content")}</span>
			<div className="flex gap-3">
				<Button text={t("button")} variant="primary" onClick={handleBack} />
				<Link href={`/@me`}>{t("profile")}</Link>
			</div>
		</main>
	);
}
