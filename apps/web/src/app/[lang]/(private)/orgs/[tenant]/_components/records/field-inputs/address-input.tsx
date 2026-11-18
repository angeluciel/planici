"use client";

import { type AddressPart, BRAZIL_STATES } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type AddressDraft, emptyAddress } from "../field-value";
import { maskCep } from "../masks";
import { FieldMessage } from "./field-message";
import type { FieldInputProps } from "./types";

const NONE = "__none__";

// Seven inputs in a group. The CEP input carries the group's id, so the form
// can focus it. A group error (`address.incomplete`) shows under the legend.
export function AddressInput({
	id,
	field,
	label,
	value,
	onChange,
	error,
	partErrors = {},
	disabled,
	entity,
}: Readonly<FieldInputProps>) {
	const t = useTranslations(`${entity}.form.address`);
	const empty = useTranslations(`${entity}.view`)("empty");
	const draft: AddressDraft = {
		...emptyAddress(),
		...(typeof value === "object" && value
			? (value as Partial<AddressDraft>)
			: {}),
	};
	const states = useMemo(
		() => [
			{ value: NONE, label: empty },
			...BRAZIL_STATES.map((state) => ({ value: state, label: state })),
		],
		[empty],
	);

	const mark = field.required ? " *" : "";
	const set = (part: AddressPart, next: string) =>
		onChange({ ...draft, [part]: next });
	const partId = (part: AddressPart) => (part === "cep" ? id : `${id}-${part}`);
	const groupHint = `${id}-group-hint`;
	const hint = error ?? field.helpText ?? undefined;
	const text = (
		part: AddressPart,
		extra?: { mask?: (v: string) => string },
	) => (
		<Input
			id={partId(part)}
			label={`${t(part)}${part === "complement" ? "" : mark}`}
			value={draft[part]}
			status={partErrors[part] ? "error" : "default"}
			help={partErrors[part]}
			disabled={disabled}
			inputMode={part === "cep" ? "numeric" : undefined}
			autoComplete={AUTOCOMPLETE[part]}
			className="min-w-0"
			onChange={(event) =>
				set(
					part,
					extra?.mask ? extra.mask(event.target.value) : event.target.value,
				)
			}
		/>
	);

	return (
		<fieldset
			className="flex w-full min-w-0 flex-col gap-2"
			aria-describedby={hint ? groupHint : undefined}
			aria-invalid={error ? true : undefined}
		>
			<legend
				className={cn(
					"pb-1 font-body-sm text-text-primary",
					error && "text-text-status-danger",
				)}
			>
				{label}
			</legend>
			<FieldMessage
				id={groupHint}
				message={hint}
				tone={error ? "error" : "help"}
			/>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{text("cep", { mask: maskCep })}
				{text("street")}
				{text("number")}
				{text("complement")}
				{text("district")}
				{text("city")}
				<div className="flex min-w-0 flex-col">
					<label
						htmlFor={partId("state")}
						className={cn(
							"flex pb-1 font-body-sm text-text-primary",
							partErrors.state && "text-text-status-danger",
						)}
					>
						{`${t("state")}${mark}`}
					</label>
					<Select
						id={partId("state")}
						label={`${t("state")}${mark}`}
						value={draft.state === "" ? NONE : draft.state}
						options={states}
						disabled={disabled}
						invalid={Boolean(partErrors.state)}
						describedBy={
							partErrors.state ? `${partId("state")}-hint` : undefined
						}
						onValueChange={(next) => set("state", next === NONE ? "" : next)}
					/>
					<FieldMessage
						id={`${partId("state")}-hint`}
						message={partErrors.state}
						tone="error"
					/>
				</div>
			</div>
		</fieldset>
	);
}

const AUTOCOMPLETE: Record<AddressPart, string> = {
	cep: "postal-code",
	street: "address-line1",
	number: "off",
	complement: "address-line2",
	district: "off",
	city: "address-level2",
	state: "address-level1",
};
