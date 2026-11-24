// Where a server (or schema) `field` path shows its message (SPEC-0002 Web).
// Paths are `fields`, `fields.<i>` and `fields.<i>.<key>[.<j>.<key>]`.

export type FieldErrorSlot =
	| "top"
	| "label"
	| "type"
	| "required"
	| "sensitive"
	| "helpText"
	| "options"
	| { option: number };

export type FieldErrorTarget =
	| { kind: "list" }
	| { kind: "row"; index: number; slot: FieldErrorSlot };

// the react-hook-form path the editor stores the message under
export function fieldErrorPath(target: FieldErrorTarget): string {
	if (target.kind === "list") return "fields.root";
	const { index, slot } = target;
	if (typeof slot === "object") {
		return `fields.${index}.options.${slot.option}.label`;
	}
	if (slot === "top") return `fields.${index}.root`;
	if (slot === "options") return `fields.${index}.options.root`;
	return `fields.${index}.${slot}`;
}

export function fieldErrorTarget(
	path: readonly PropertyKey[] | string | undefined,
): FieldErrorTarget | null {
	const parts =
		typeof path === "string" ? path.split(".") : (path ?? []).map(String);
	if (parts[0] !== "fields") return null;
	if (parts.length === 1) return { kind: "list" };

	const index = Number(parts[1]);
	if (!Number.isInteger(index) || index < 0) return null;
	const key = parts[2];
	if (key === undefined) return { kind: "row", index, slot: "top" };

	switch (key) {
		case "id":
		case "systemKey":
			return { kind: "row", index, slot: "top" };
		case "label":
		case "type":
		case "required":
		case "sensitive":
		case "helpText":
			return { kind: "row", index, slot: key };
		case "options": {
			const option = Number(parts[3]);
			if (parts.length >= 4 && Number.isInteger(option) && option >= 0) {
				return { kind: "row", index, slot: { option } };
			}
			return { kind: "row", index, slot: "options" };
		}
		default:
			return { kind: "row", index, slot: "top" };
	}
}
