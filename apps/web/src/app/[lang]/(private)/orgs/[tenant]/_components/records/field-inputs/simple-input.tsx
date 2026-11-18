"use client";

import type { Field } from "@planici/schemas";
import { Input } from "@/components/ui/input";
import { maskCpf, maskPhone } from "../masks";
import type { FieldInputProps } from "./types";

type Config = {
	type?: "text" | "date" | "email";
	inputMode?: "text" | "decimal" | "numeric" | "tel" | "email";
	autoComplete?: string;
	mask?: (value: string) => string;
	maxLength?: number;
};

const CONFIG: Partial<Record<Field["type"], Config>> = {
	text: {},
	full_name: { autoComplete: "name" },
	email: { type: "email", inputMode: "email", autoComplete: "email" },
	// the number input accepts "72,5" and "72.5" (Decision 7), so it is text
	number: { inputMode: "decimal" },
	date: { type: "date" },
	phone: { inputMode: "tel", autoComplete: "tel", mask: maskPhone },
	cpf: { inputMode: "numeric", mask: maskCpf },
};

// text, full_name, email, number, date, phone and cpf: one `Input` each
export function SimpleInput({
	id,
	field,
	label,
	value,
	onChange,
	error,
	disabled,
}: Readonly<FieldInputProps>) {
	const config = CONFIG[field.type] ?? {};
	const help = error ?? field.helpText ?? undefined;

	return (
		<Input
			id={id}
			label={label}
			type={config.type ?? "text"}
			inputMode={config.inputMode}
			autoComplete={config.autoComplete}
			value={typeof value === "string" ? value : ""}
			status={error ? "error" : "default"}
			help={help}
			disabled={disabled}
			aria-required={field.required || undefined}
			onChange={(event) =>
				onChange(
					config.mask ? config.mask(event.target.value) : event.target.value,
				)
			}
		/>
	);
}
