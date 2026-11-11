"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id?: string; label: string };

const MAX_OPTIONS = 50;

// Add, rename and remove the options of a `select`. Renaming keeps the option
// id (R13); the count and label rules are checked on save.
export function FieldOptionsEditor({
	options,
	onChange,
	errorOf,
	groupError,
	groupErrorId,
}: Readonly<{
	options: readonly Option[];
	onChange: (options: Option[]) => void;
	// message shown under option j
	errorOf: (index: number) => string | undefined;
	// message for the list as a whole (fewer than 2, more than 50)
	groupError?: string;
	groupErrorId: string;
}>) {
	const t = useTranslations("forms.fields");

	return (
		<fieldset
			className="flex flex-col gap-2"
			aria-describedby={groupError ? groupErrorId : undefined}
		>
			<legend className="pb-1 font-body-sm text-text-primary">
				{t("options")}
			</legend>
			<ul className="flex flex-col gap-1">
				{options.map((option, index) => {
					const error = errorOf(index);
					return (
						// options have no stable key until saved; the list is edited in place
						// biome-ignore lint/suspicious/noArrayIndexKey: see above
						<li key={index} className="flex items-start gap-2">
							<Input
								aria-label={`${t("options")} ${index + 1}`}
								autoComplete="off"
								className="min-w-0 flex-1"
								value={option.label}
								status={error ? "error" : "default"}
								help={error}
								onChange={(event) =>
									onChange(
										options.map((current, i) =>
											i === index
												? { ...current, label: event.target.value }
												: current,
										),
									)
								}
							/>
							<button
								type="button"
								aria-label={t("removeOption")}
								onClick={() => onChange(options.filter((_, i) => i !== index))}
								className="mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
							>
								<XIcon aria-hidden="true" className="size-4" />
							</button>
						</li>
					);
				})}
			</ul>
			{groupError && (
				<p
					id={groupErrorId}
					role="alert"
					className="font-body-sm font-medium text-text-status-danger"
				>
					{groupError}
				</p>
			)}
			<Button
				variant="subtle"
				text={t("addOption")}
				leadingIcon={PlusIcon}
				className="w-auto self-start"
				disabled={options.length >= MAX_OPTIONS}
				onPress={() => onChange([...options, { label: "" }])}
			/>
		</fieldset>
	);
}
