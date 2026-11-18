"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { FieldInputProps } from "./types";

// Never required (SPEC-0002 R8): unchecked is "no value", which counts as false.
export function YesNoInput({
	id,
	field,
	label,
	value,
	onChange,
	error,
	disabled,
}: Readonly<FieldInputProps>) {
	return (
		<Checkbox
			id={id}
			label={label}
			checked={value === true}
			status={error ? "error" : "default"}
			help={error ?? field.helpText ?? undefined}
			disabled={disabled}
			onChange={(event) => onChange(event.target.checked)}
		/>
	);
}
