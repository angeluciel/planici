"use client";

import type { Field } from "@planici/schemas";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";
import { maskCep, maskCpf, maskPhone } from "./masks";

// The "shown as" column of SPEC-0003 §3.1, by the active locale (Decision 7).

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

type Formatter = ReturnType<typeof useFormatter>;

function formatAddress(value: Record<string, unknown>): string {
	const text = (key: string) =>
		typeof value[key] === "string" ? (value[key] as string).trim() : "";
	const street = [text("street"), text("number"), text("complement")]
		.filter(Boolean)
		.join(", ");
	const city = [text("city"), text("state")].filter(Boolean).join("/");
	const cep = text("cep") ? maskCep(text("cep")) : "";
	return [street, text("district"), city, cep].filter(Boolean).join(", ");
}

/** The text of one stored value, or "" when there is nothing to show. */
export function formatFieldValue(
	field: Pick<Field, "type" | "options">,
	value: unknown,
	deps: { format: Formatter; yes: string; no: string },
): string {
	if (value === null || value === undefined) return "";

	switch (field.type) {
		case "yes_no":
			return value === true ? deps.yes : deps.no;
		case "number":
			return typeof value === "number"
				? deps.format.number(value, {
						minimumFractionDigits: 0,
						maximumFractionDigits: 2,
					})
				: "";
		case "date": {
			const match = typeof value === "string" ? DATE.exec(value) : null;
			if (!match) return "";
			const date = new Date(
				Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
			);
			return deps.format.dateTime(date, {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				timeZone: "UTC",
			});
		}
		case "select":
			return field.options?.find((option) => option.id === value)?.label ?? "";
		case "phone":
			return typeof value === "string" ? maskPhone(value) : "";
		case "cpf":
			return typeof value === "string" ? maskCpf(value) : "";
		case "address":
			return typeof value === "object"
				? formatAddress(value as Record<string, unknown>)
				: "";
		default:
			return typeof value === "string" ? value : "";
	}
}

export function useFormatFieldValue(entity: string) {
	const format = useFormatter();
	const t = useTranslations(entity);
	const yes = t("view.yes");
	const no = t("view.no");

	return useCallback(
		(field: Pick<Field, "type" | "options">, value: unknown) =>
			formatFieldValue(field, value, { format, yes, no }),
		[format, yes, no],
	);
}

/** A number as the input shows it: locale decimal separator, no grouping. */
export function useNumberText() {
	const format = useFormatter();
	return useCallback(
		(n: number) =>
			format.number(n, { useGrouping: false, maximumFractionDigits: 2 }),
		[format],
	);
}
