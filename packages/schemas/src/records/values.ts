import { z } from "zod";
import type { Field } from "../forms/fields.js";
import { BRAZIL_AREA_CODES, BRAZIL_STATES } from "./area-codes.js";

// Value rules per field type (SPEC-0003 §3.1). Each schema normalises first,
// then checks the limits. The message of an issue is its error key; no issue
// ever carries the value.

export const NUMBER_LIMIT = 999_999_999.99;
export const DATE_MIN_YEAR = 1900;
export const DATE_MAX_YEAR = 2100;

export const TEXT_MAX_LENGTH = 255;
export const LONG_TEXT_MAX_LENGTH = 5000;
export const FULL_NAME_MAX_LENGTH = 120;

export const ADDRESS_PARTS = ["cep", "street", "number", "complement", "district", "city", "state"] as const;
export type AddressPart = (typeof ADDRESS_PARTS)[number];

const ADDRESS_REQUIRED_PARTS = ["cep", "street", "number", "district", "city", "state"] as const;
const ADDRESS_MAX_LENGTHS = { street: 120, number: 10, complement: 60, district: 60, city: 60 } as const;

const AREA_CODES: ReadonlySet<string> = new Set(BRAZIL_AREA_CODES);
const STATES: ReadonlySet<string> = new Set(BRAZIL_STATES);

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const textSchema = (max: number) => z.string({ error: "value.invalid" }).trim().max(max, { error: "value.max" });

function isValidCpf(digits: string): boolean {
	if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
	const check = (length: number) => {
		let sum = 0;
		for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
		const rest = (sum * 10) % 11;
		return rest === 10 ? 0 : rest;
	};
	return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

function isValidPhone(digits: string): boolean {
	if (digits.length !== 10 && digits.length !== 11) return false;
	if (!AREA_CODES.has(digits.slice(0, 2))) return false;
	return digits.length === 10 || digits[2] === "9";
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	if (year < DATE_MIN_YEAR || year > DATE_MAX_YEAR) return false;
	const date = new Date(Date.UTC(year, month - 1, day));
	// the constructor rolls 2025-02-30 over to March; a real date does not move
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Phone number, normalised to digits. Also used for a client's phone (SPEC-0004 R4). */
export const PhoneValueSchema = z
	.string({ error: "value.invalid" })
	.transform(digitsOnly)
	.refine(isValidPhone, { error: "phone.invalid" });

const CpfValueSchema = z
	.string({ error: "value.invalid" })
	.transform(digitsOnly)
	.refine(isValidCpf, { error: "cpf.invalid" });

const NumberValueSchema = z
	.number({ error: "value.invalid" })
	.refine((n) => Math.abs(n) <= NUMBER_LIMIT && Number(n.toFixed(2)) === n, { error: "number.invalid" });

const DateValueSchema = z.string({ error: "value.invalid" }).trim().refine(isValidDate, { error: "date.invalid" });

const EmailValueSchema = z
	.string({ error: "value.invalid" })
	.trim()
	.pipe(z.email({ error: "email.invalid" }))
	.transform((email) => email.toLowerCase());

const FullNameValueSchema = z
	.string({ error: "value.invalid" })
	.trim()
	.overwrite((name) => name.replace(/\s+/g, " "))
	.max(FULL_NAME_MAX_LENGTH, { error: "value.max" });

export const AddressValueSchema = z.object({
	cep: z.string(),
	street: z.string(),
	number: z.string(),
	complement: z.string().nullable(),
	district: z.string(),
	city: z.string(),
	state: z.string(),
});

export type AddressValue = z.infer<typeof AddressValueSchema>;

type AddressIssue = { code: string; path: AddressPart[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isBlankPart = (part: unknown) => part == null || (typeof part === "string" && part.trim() === "");

const partIssue = (part: AddressPart, code: string) => ({ issue: { code, path: [part] } });

/**
 * One part of an address that passed the completeness check: a blank
 * complement is null, any other part must be a string, normalised and then
 * checked.
 */
function parseAddressPart(part: AddressPart, raw: unknown): { value: string | null } | { issue: AddressIssue } {
	if (part === "complement" && isBlankPart(raw)) return { value: null };
	if (typeof raw !== "string") return partIssue(part, "value.invalid");

	const trimmed = raw.trim();
	switch (part) {
		case "cep": {
			const digits = digitsOnly(trimmed);
			return digits.length === 8 ? { value: digits } : partIssue(part, "cep.invalid");
		}
		case "state": {
			const state = trimmed.toUpperCase();
			return STATES.has(state) ? { value: state } : partIssue(part, "uf.invalid");
		}
		default:
			return trimmed.length > ADDRESS_MAX_LENGTHS[part] ? partIssue(part, "value.max") : { value: trimmed };
	}
}

/**
 * Completeness first, then the parts in the order cep, street, number,
 * complement, district, city, state (SPEC-0003 plan, Decision 3).
 */
function parseAddress(input: unknown): { value: AddressValue } | { issue: AddressIssue } {
	if (!isPlainObject(input)) return { issue: { code: "value.invalid", path: [] } };

	if (ADDRESS_REQUIRED_PARTS.some((part) => isBlankPart(input[part]))) {
		return { issue: { code: "address.incomplete", path: [] } };
	}

	const out: Record<string, string | null> = {};
	for (const part of ADDRESS_PARTS) {
		const result = parseAddressPart(part, input[part]);
		if ("issue" in result) return result;
		out[part] = result.value;
	}

	return { value: out as AddressValue };
}

const AddressSchema = z.unknown().transform((input, ctx) => {
	const result = parseAddress(input);
	if ("issue" in result) {
		ctx.issues.push({ code: "custom", message: result.issue.code, path: result.issue.path, input });
		return z.NEVER;
	}
	return result.value;
});

/**
 * R3: `null`, an empty or whitespace-only string, or an address whose parts are
 * all blank means "no value".
 */
export function isBlankValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === "string") return value.trim() === "";
	if (isPlainObject(value)) return ADDRESS_PARTS.every((part) => isBlankPart(value[part]));
	return false;
}

type ValueField = Pick<Field, "type" | "options">;

/**
 * The schema of one non-blank custom value, by field type. `duration` and
 * `money` are system-only and never reach it: they reject every value.
 */
export function customValueSchema(field: ValueField): z.ZodType<unknown> {
	switch (field.type) {
		case "text":
			return textSchema(TEXT_MAX_LENGTH);
		case "long_text":
			return textSchema(LONG_TEXT_MAX_LENGTH);
		case "full_name":
			return FullNameValueSchema;
		case "number":
			return NumberValueSchema;
		case "date":
			return DateValueSchema;
		case "yes_no":
			return z.boolean({ error: "value.invalid" });
		case "select": {
			const ids = new Set((field.options ?? []).map((option) => option.id));
			return z.string({ error: "value.invalid" }).refine((id) => ids.has(id), { error: "option.invalid" });
		}
		case "email":
			return EmailValueSchema;
		case "phone":
			return PhoneValueSchema;
		case "cpf":
			return CpfValueSchema;
		case "address":
			return AddressSchema;
		default:
			return z.unknown().refine(() => false, { error: "value.invalid" });
	}
}

type FormField = Pick<Field, "id" | "type" | "required" | "options" | "systemKey">;

/**
 * The values object of the fill-in form: one entry per custom field of the
 * version, keyed by field id. It reports every issue (at `<fieldId>` and
 * `<fieldId>.<part>`), adds `value.required`, and returns the normalised values
 * without blanks. A `yes_no` field is never required (SPEC-0002 R8).
 */
export function recordValuesSchema(fields: readonly FormField[]) {
	const custom = fields.filter((field) => field.systemKey === null);

	return z.record(z.string(), z.unknown(), { error: "values.invalid" }).transform((values, ctx) => {
		const out: Record<string, unknown> = {};

		for (const field of custom) {
			const value = values[field.id];
			if (isBlankValue(value)) {
				if (field.required && field.type !== "yes_no") {
					ctx.issues.push({ code: "custom", message: "value.required", path: [field.id], input: value });
				}
				continue;
			}

			const parsed = customValueSchema(field).safeParse(value);
			if (parsed.success) {
				out[field.id] = parsed.data;
				continue;
			}
			for (const issue of parsed.error.issues) {
				ctx.issues.push({
					code: "custom",
					message: issue.message,
					path: [field.id, ...issue.path],
					input: value,
				});
			}
		}

		return out;
	});
}
