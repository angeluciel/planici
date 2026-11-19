"use client";

import { Input } from "@/components/ui/input";
import { maskPhone } from "../../_components/records/masks";
import type { SystemInputProps } from "../../_components/records/record-adapter";

const asText = (value: unknown) => (typeof value === "string" ? value : "");

// The three system fields of a client template (SPEC-0004 §7, Adapter). The
// form passes the final label and the error or help text.

export function ClientNameInput({
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
			autoComplete="name"
			value={asText(value)}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}

export function ClientEmailInput({
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
			type="email"
			inputMode="email"
			autoComplete="email"
			value={asText(value)}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}

export function ClientPhoneInput({
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
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			placeholder="(11) 98765-4321"
			value={maskPhone(asText(value))}
			status={status}
			help={help}
			disabled={disabled}
			aria-required={required || undefined}
			onChange={(event) => onChange(maskPhone(event.target.value))}
		/>
	);
}
