"use client";

import { cn } from "@/lib/utils";
import { FieldMessage } from "./field-inputs/field-message";

// The record's name typed as the page heading (SPEC-0007 R1), styled like the
// template editor's name input. The field's label names it and is its
// placeholder (R3); it is always required and shows no "*" (R4). Under it, the
// error, or the help text when there is none.
export function RecordTitleInput({
	id,
	label,
	value,
	onChange,
	error,
	help,
	disabled,
}: Readonly<{
	id: string;
	label: string;
	value: unknown;
	onChange: (value: string) => void;
	error?: string;
	help?: string;
	disabled?: boolean;
}>) {
	const messageId = `${id}-help`;
	const message = error ?? help;

	return (
		<div className="flex flex-col gap-1">
			<input
				id={id}
				type="text"
				autoComplete="off"
				aria-label={label}
				placeholder={label}
				aria-required="true"
				aria-invalid={error ? true : undefined}
				aria-describedby={message ? messageId : undefined}
				value={typeof value === "string" ? value : ""}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				className={cn(
					"w-full rounded-sm bg-transparent font-heading-lg outline-none placeholder:text-text-disabled",
					// `outline-none` sets the outline style to none; restore it for the keyboard ring (P-2)
					"focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-border-focused",
					error ? "text-text-status-danger" : "text-text-bold",
				)}
			/>
			<FieldMessage
				id={messageId}
				message={message}
				tone={error ? "error" : "help"}
			/>
		</div>
	);
}
