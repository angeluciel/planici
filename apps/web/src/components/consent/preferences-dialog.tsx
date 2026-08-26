"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
	COOKIE_INVENTORY,
	type ConsentCategory,
	type ConsentChoices,
	OPTIONAL_CATEGORIES,
} from "@/lib/consent";
import { Button } from "../button";
import { useConsent } from "./consent-provider";

function CookieTable({ category }: Readonly<{ category: ConsentCategory }>) {
	const t = useTranslations("consent");
	const cookies = COOKIE_INVENTORY[category];

	if (cookies.length === 0) {
		return (
			<p className="font-body-xs text-text-secondary">
				{t("dialog.cookie-table.none")}
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left font-body-xs">
				<thead>
					<tr className="text-text-secondary">
						<th scope="col" className="py-1 pr-3 font-medium">
							{t("dialog.cookie-table.name")}
						</th>
						<th scope="col" className="py-1 pr-3 font-medium">
							{t("dialog.cookie-table.purpose")}
						</th>
						<th scope="col" className="py-1 font-medium">
							{t("dialog.cookie-table.duration")}
						</th>
					</tr>
				</thead>
				<tbody className="text-text-primary">
					{cookies.map((cookie) => (
						<tr key={cookie.name} className="border-t border-border-input">
							<td className="py-1 pr-3 font-mono">{cookie.name}</td>
							<td className="py-1 pr-3">
								{t(`cookies.${cookie.key}.purpose`)}
							</td>
							<td className="py-1 whitespace-nowrap">
								{t(`cookies.${cookie.key}.duration`)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CategorySection({
	category,
	checked,
	locked = false,
	onToggle,
}: Readonly<{
	category: ConsentCategory;
	checked: boolean;
	locked?: boolean;
	onToggle?: (next: boolean) => void;
}>) {
	const t = useTranslations("consent");

	return (
		<section className="flex flex-col gap-2 border-t border-border-input pt-4">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h3 className="font-heading-2xs text-text-primary">
						{t(`categories.${category}.name`)}
					</h3>
					<p className="font-body-sm text-text-secondary">
						{t(`categories.${category}.description`)}
					</p>
				</div>

				{locked ? (
					<span className="shrink-0 rounded-sm bg-background-accent-gray-subtler px-2 py-1 font-body-xs text-text-secondary">
						{t("dialog.always-on")}
					</span>
				) : (
					<label className="flex shrink-0 cursor-pointer items-center gap-2">
						<span className="sr-only">{t(`categories.${category}.name`)}</span>
						<input
							type="checkbox"
							checked={checked}
							onChange={(event) => onToggle?.(event.target.checked)}
							className="peer sr-only"
						/>
						<span
							aria-hidden
							className="relative h-6 w-11 rounded-full bg-background-accent-gray-bold transition-colors peer-checked:bg-background-brand-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-focused after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:transition-transform peer-checked:after:translate-x-5"
						/>
					</label>
				)}
			</div>

			<CookieTable category={category} />
		</section>
	);
}

export function PreferencesDialog() {
	const t = useTranslations("consent");
	const tCommon = useTranslations("common");
	const { grants, preferencesOpen, closePreferences, save } = useConsent();
	const dialogRef = useRef<HTMLDialogElement>(null);

	const [draft, setDraft] = useState<ConsentChoices>(grants);

	useEffect(() => {
		if (preferencesOpen) setDraft(grants);
	}, [preferencesOpen, grants]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (preferencesOpen && !dialog.open) {
			dialog.showModal();
		} else if (!preferencesOpen && dialog.open) {
			dialog.close();
		}
	}, [preferencesOpen]);

	return (
		<dialog
			ref={dialogRef}
			onClose={closePreferences}
			aria-labelledby="consent-dialog-title"
			className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-md bg-surface-overlay p-0 text-text-primary shadow-overlay backdrop:bg-black/50"
		>
			<div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto p-6">
				<div className="flex items-start justify-between gap-4">
					<h2 id="consent-dialog-title" className="font-heading-md">
						{t("dialog.title")}
					</h2>
					<button
						type="button"
						onClick={closePreferences}
						aria-label={tCommon("close")}
						className="rounded-sm p-1 text-icon-subtle hover:bg-surface-hovered"
					>
						<X aria-hidden className="size-5" />
					</button>
				</div>

				<p className="font-body-sm text-text-secondary">
					{t("dialog.description")}
				</p>

				<CategorySection category="necessary" checked locked />

				{OPTIONAL_CATEGORIES.map((category) => (
					<CategorySection
						key={category}
						category={category}
						checked={draft[category]}
						onToggle={(next) =>
							setDraft((current) => ({ ...current, [category]: next }))
						}
					/>
				))}

				<div className="flex justify-end pt-2">
					<Button
						text={t("dialog.save")}
						variant="primary"
						onPress={() => save(draft)}
						className="w-auto px-4"
					/>
				</div>
			</div>
		</dialog>
	);
}
