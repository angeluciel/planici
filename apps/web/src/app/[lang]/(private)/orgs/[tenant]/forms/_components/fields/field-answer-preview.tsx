"use client";

import { useTranslations } from "next-intl";
import type { DraftField } from "./field-model";

const BOX =
	"rounded-md border border-border-input px-2 py-1.5 font-body-sm text-text-disabled";

// What the answer will look like, never filled in (SPEC-0002 §4.6 step 2,
// Q16). Hidden from assistive tech: the card's name and type say it already.
export function FieldAnswerPreview({
	field,
}: Readonly<{ field: Pick<DraftField, "type" | "options"> }>) {
	const t = useTranslations("forms.fields");

	if (field.type === "yes_no") {
		return (
			<div aria-hidden="true" className="flex gap-2">
				<span className={BOX}>{t("previewYes")}</span>
				<span className={BOX}>{t("previewNo")}</span>
			</div>
		);
	}

	if (field.type === "select") {
		return (
			<ul aria-hidden="true" className="flex flex-col gap-1">
				{(field.options ?? []).map((option, index) => (
					// options have no stable key until saved
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					<li key={index} className="flex items-center gap-2 font-body-sm">
						<span className="size-4 shrink-0 rounded-full border border-border-input" />
						<span className="text-text-secondary">
							{option.label || `${t("options")} ${index + 1}`}
						</span>
					</li>
				))}
			</ul>
		);
	}

	return (
		<div
			aria-hidden="true"
			className={`${BOX} ${field.type === "long_text" ? "min-h-16" : ""}`}
		>
			{t("answerPreview")}
		</div>
	);
}
