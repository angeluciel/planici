import type { Field, FieldInput, FieldType } from "@planici/schemas";
import { applyLocks } from "./field-protection";

// A draft row. `replaces` is client-only: when the type of a published field
// changes, the row becomes a new field (R12) and keeps the original here so
// that picking the original type again can restore it. The editor's schema
// parse drops it before anything is sent.
export type DraftField = FieldInput & { replaces?: Field };

export const MAX_FIELDS = 100;

export function newField(): DraftField {
	return { label: "", type: "text", required: false };
}

function optionsOf(field: Field) {
	return field.options?.map(({ id, label }) => ({ id, label }));
}

function restore(row: DraftField, original: Field): DraftField {
	const options = optionsOf(original);
	return applyLocks({
		id: original.id,
		label: row.label,
		type: original.type,
		required: original.required,
		...(original.sensitive ? { sensitive: true } : {}),
		...(row.helpText === undefined ? {} : { helpText: row.helpText }),
		...(options ? { options } : {}),
	});
}

// The row after the professional picks `next` (SPEC-0002 §4.2, R8, R12).
// `published` is the field this row was loaded from, or the one it replaced.
export function changeType(
	row: DraftField,
	next: FieldType,
	published: Field | undefined,
): DraftField {
	if (next === row.type) return row;
	if (published && next === published.type) return restore(row, published);

	const { options: _options, id, replaces, ...rest } = row;
	const base: DraftField = {
		...rest,
		type: next,
		// an existing field becomes a new one, and remembers where it came from
		...(published ? { replaces: replaces ?? published } : {}),
		...(id && !published ? { id } : {}),
		...(next === "select" ? { options: [{ label: "" }, { label: "" }] } : {}),
	};
	return applyLocks(base);
}
