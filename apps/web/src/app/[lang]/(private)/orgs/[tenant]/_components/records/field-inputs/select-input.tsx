"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FieldMessage } from "./field-message";
import type { FieldInputProps } from "./types";

// The "—" choice of an optional select clears the value (Decision 13). The
// shared Select has no empty value, so the choice carries a sentinel.
const NONE = "__none__";

export function SelectInput({
	id,
	field,
	label,
	value,
	onChange,
	error,
	disabled,
	entity,
}: Readonly<FieldInputProps>) {
	const t = useTranslations(`${entity}.view`);
	const options = useMemo<SelectOption[]>(() => {
		const mapped = (field.options ?? []).map((option) => ({
			value: option.id,
			label: option.label,
		}));
		return field.required
			? mapped
			: [{ value: NONE, label: t("empty") }, ...mapped];
	}, [field.options, field.required, t]);

	const hintId = `${id}-hint`;
	const message = error ?? field.helpText ?? undefined;
	const current = typeof value === "string" ? value : "";

	return (
		<div className="flex w-full flex-col">
			<label
				htmlFor={id}
				className={cn(
					"flex pb-1 font-body-sm text-text-primary",
					error && "text-text-status-danger",
				)}
			>
				{label}
			</label>
			<Select
				id={id}
				label={label}
				value={current === "" && !field.required ? NONE : current}
				options={options}
				disabled={disabled}
				invalid={Boolean(error)}
				describedBy={message ? hintId : undefined}
				onValueChange={(next) => onChange(next === NONE ? "" : next)}
			/>
			<FieldMessage
				id={hintId}
				message={message}
				tone={error ? "error" : "help"}
			/>
		</div>
	);
}
