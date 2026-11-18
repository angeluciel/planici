"use client";

import { useTranslations } from "next-intl";
import type { ComponentPropsWithoutRef, Ref } from "react";
import type { DraftField } from "../field-model";
import type { RowErrors } from "./field-card-errors";
import { withLabel } from "./field-updates";

export function CardTextInput({
	error,
	errorId,
	className,
	inputRef,
	...props
}: Readonly<
	Omit<ComponentPropsWithoutRef<"input">, "className"> & {
		error?: string;
		errorId: string;
		className?: string;
		inputRef?: Ref<HTMLInputElement>;
	}
>) {
	return (
		<div className="flex w-full flex-col gap-1">
			<input
				{...props}
				ref={inputRef}
				autoComplete="off"
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				className={` min-w-[2ch] max-w-full rounded-md bg-transparent px-2 py-1 text-text-bold placeholder:text-text-disabled focus:outline-none field-sizing-content self-start w-auto ${
					error
						? "border-border-danger"
						: "border-transparent hover:border-border-input focus:border-border-focused"
				} ${className ?? ""}`}
			/>
			{error && (
				<p
					id={errorId}
					role="alert"
					className="px-2 font-body-sm font-medium text-text-status-danger"
				>
					{error}
				</p>
			)}
		</div>
	);
}

// The label and description inputs at the top of the sheet (narrow screens
// only; §4.6 step 4).
export function FieldTextInputs({
	field,
	errors,
	baseId,
	labelRef,
	selectOnFocus,
	onSelected,
	onChange,
}: Readonly<{
	field: DraftField;
	errors: RowErrors;
	baseId: string;
	labelRef?: Ref<HTMLInputElement>;
	// a new field's label selects its text on its first focus (§4.1 step 2)
	selectOnFocus?: boolean;
	onSelected?: () => void;
	onChange: (next: DraftField) => void;
}>) {
	const t = useTranslations("forms.fields");
	const helpOn = field.helpText !== null && field.helpText !== undefined;

	return (
		<>
			<CardTextInput
				data-field-label=""
				data-error-slot="label"
				aria-label={t("label")}
				inputRef={labelRef}
				className="font-body-md font-semibold"
				value={field.label}
				error={errors.label}
				errorId={`${baseId}-label-error`}
				onFocus={(event) => {
					if (!selectOnFocus) return;
					event.currentTarget.select();
					onSelected?.();
				}}
				onChange={(event) => onChange(withLabel(field, event.target.value))}
			/>
			{helpOn && (
				<CardTextInput
					data-error-slot="helpText"
					aria-label={t("helpText")}
					placeholder={t("descriptionPlaceholder")}
					className="font-body-sm"
					value={field.helpText ?? ""}
					error={errors.helpText}
					errorId={`${baseId}-help-error`}
					onChange={(event) =>
						onChange({ ...field, helpText: event.target.value })
					}
				/>
			)}
		</>
	);
}
