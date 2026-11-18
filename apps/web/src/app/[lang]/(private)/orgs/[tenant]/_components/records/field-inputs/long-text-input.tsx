"use client";

import { Textarea } from "@/components/ui/textarea";
import type { FieldInputProps } from "./types";

export function LongTextInput({
	id,
	field,
	label,
	value,
	onChange,
	error,
	disabled,
}: Readonly<FieldInputProps>) {
	return (
		<Textarea
			id={id}
			label={label}
			value={typeof value === "string" ? value : ""}
			status={error ? "error" : "default"}
			help={error ?? field.helpText ?? undefined}
			disabled={disabled}
			aria-required={field.required || undefined}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
