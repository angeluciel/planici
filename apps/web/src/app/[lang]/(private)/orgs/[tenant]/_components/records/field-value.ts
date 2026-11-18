import { ADDRESS_PARTS, type AddressPart, type Field } from "@planici/schemas";
import { maskCep, maskCpf, maskPhone } from "./masks";

// Conversions between a record's wire values (SPEC-0003 §7) and what the
// inputs hold. The inputs hold text for everything except `yes_no` (boolean)
// and `address` (an object of text parts), so typing never loses characters.

export type AddressDraft = Record<AddressPart, string>;

export const emptyAddress = (): AddressDraft => ({
	cep: "",
	street: "",
	number: "",
	complement: "",
	district: "",
	city: "",
	state: "",
});

export function emptyValue(field: Pick<Field, "type">): unknown {
	if (field.type === "yes_no") return false;
	if (field.type === "address") return emptyAddress();
	return "";
}

const asText = (value: unknown) => (typeof value === "string" ? value : "");

/** A stored value as the input shows it. `numberText` formats a number for the active locale. */
export function valueToInput(
	field: Pick<Field, "type">,
	value: unknown,
	numberText: (n: number) => string,
): unknown {
	if (value === null || value === undefined) return emptyValue(field);

	switch (field.type) {
		case "yes_no":
			return value === true;
		case "number":
			return typeof value === "number" ? numberText(value) : "";
		case "phone":
			return maskPhone(asText(value));
		case "cpf":
			return maskCpf(asText(value));
		case "address": {
			const draft = emptyAddress();
			if (typeof value !== "object") return draft;
			const parts = value as Record<string, unknown>;
			for (const part of ADDRESS_PARTS) draft[part] = asText(parts[part]);
			draft.cep = maskCep(draft.cep);
			return draft;
		}
		default:
			return asText(value);
	}
}

// Text the number schema must reject with `number.invalid`, not accept: one
// past its limit, still a finite JSON number (zod rejects Infinity as a type error).
const NOT_A_NUMBER = 1e12;
const DECIMAL = /^[+-]?\d+(?:[.,]\d+)?$/;

/** What the typed value means to the shared schema (blank stays blank). */
export function inputToValue(
	field: Pick<Field, "type">,
	input: unknown,
): unknown {
	switch (field.type) {
		case "yes_no":
			// false is "no value" (R3); the API returns false for it
			return input === true ? true : null;
		case "number": {
			const text = asText(input).trim();
			if (text === "") return null;
			return DECIMAL.test(text) ? Number(text.replace(",", ".")) : NOT_A_NUMBER;
		}
		case "select":
			return input === "" ? null : input;
		default:
			return input;
	}
}
