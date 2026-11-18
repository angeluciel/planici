import type { Field } from "@planici/schemas";

// SPEC-0003 §4.4: after a new template version loads, keep the typed value of
// every custom field that still exists, drop the rest, and drop a `select`
// choice whose option is gone. Values are the form's own (UI) values.
export function remapValues(
	values: Readonly<Record<string, unknown>>,
	fields: readonly Field[],
): Record<string, unknown> {
	const kept: Record<string, unknown> = {};

	for (const field of fields) {
		if (field.systemKey !== null || !(field.id in values)) continue;

		const value = values[field.id];
		if (field.type === "select") {
			const exists = (field.options ?? []).some(
				(option) => option.id === value,
			);
			if (!exists) continue;
		}
		kept[field.id] = value;
	}

	return kept;
}
