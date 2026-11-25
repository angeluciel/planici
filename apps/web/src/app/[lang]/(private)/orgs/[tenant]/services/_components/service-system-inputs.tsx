"use client";

import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/services/duration";
import { maskPrice } from "@/lib/services/price";
import type { SystemInputProps } from "../../_components/records/record-adapter";

const asText = (value: unknown) => (typeof value === "string" ? value : "");

// The three system fields of a service template (SPEC-0005 §11, Adapter). The
// form passes the final label and the error or help text.

export function ServiceNameInput({
	id,
	label,
	value,
	onChange,
	status,
	help,
	required,
	disabled,
}: Readonly<SystemInputProps>) {
	return (
		<Input
			id={id}
			label={label}
			autoComplete="off"
			value={asText(value)}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}

// Typed as text ("1h 30"); a stored duration (minutes) shows in the display
// form of R12, which is itself an accepted input (R13).
export function ServiceDurationInput({
	id,
	label,
	value,
	onChange,
	status,
	help,
	required,
	disabled,
}: Readonly<SystemInputProps>) {
	return (
		<Input
			id={id}
			label={label}
			autoComplete="off"
			placeholder="1h 30"
			value={typeof value === "number" ? formatDuration(value) : asText(value)}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}

// The pt-BR mask: the digits typed fill the centavos, "15000" shows "150,00".
export function ServicePriceInput({
	id,
	label,
	value,
	onChange,
	status,
	help,
	required,
	disabled,
}: Readonly<SystemInputProps>) {
	return (
		<Input
			id={id}
			label={label}
			inputMode="numeric"
			autoComplete="off"
			placeholder="0,00"
			value={
				typeof value === "number" ? maskPrice(String(value)) : asText(value)
			}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(maskPrice(event.target.value))}
		/>
	);
}
