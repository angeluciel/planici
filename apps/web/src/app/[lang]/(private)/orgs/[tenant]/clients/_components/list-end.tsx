"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";

// Below the rows (SPEC-0006 §4.5): loading, a failed page with retry, or the
// closing block. The polite live region announces each page after the first.
export function ListEnd({
	loaded,
	total,
	announce,
	loading,
	failed,
	hasNext,
	onRetry,
}: Readonly<{
	loaded: number;
	total: number;
	announce: boolean;
	loading: boolean;
	failed: boolean;
	hasNext: boolean;
	onRetry: () => void;
}>) {
	const t = useTranslations("clients");
	return (
		<>
			<div aria-live="polite" className="sr-only">
				{announce ? t("list.loadedCount", { loaded, total }) : null}
			</div>

			{loading && (
				<div className="flex items-center justify-center gap-2 py-4 font-body-sm text-text-secondary">
					<SpinnerIcon />
					<span>{t("list.loadingMore")}</span>
				</div>
			)}

			{failed && (
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("list.loadMoreError")}</Alert>
					<Button
						variant="subtle"
						text={t("form.retry")}
						className="w-auto"
						onPress={onRetry}
					/>
				</div>
			)}

			{!hasNext && !loading && !failed && (
				<div className="flex flex-col items-center gap-3 py-6 text-center">
					{/* illustration slot, empty until the owner picks an SVG (Q15) */}
					<div aria-hidden="true" className="h-24" />
					<p className="font-body-sm text-text-secondary">{t("list.end")}</p>
				</div>
			)}
		</>
	);
}
