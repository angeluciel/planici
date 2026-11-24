import { type FieldInput, protectionLock } from "@planici/schemas";

// Draft-side locks (SPEC-0002 R3-R8). The server enforces the same rules; the
// draft only mirrors them so the controls show what will be accepted.

// system rows are identification data: never protected, never locked (R4)
export function sensitiveLockOf(
	field: Pick<FieldInput, "type" | "label" | "systemKey">,
): "type" | "label" | null {
	return field.systemKey ? null : protectionLock(field.type, field.label);
}

// "Obrigatório" is fixed on system rows (except the client's phone, R3) and
// off on yes/no fields (R8)
export function requiredLocked(
	field: Pick<FieldInput, "type" | "systemKey">,
): boolean {
	if (field.systemKey) return field.systemKey !== "client.phone";
	return field.type === "yes_no";
}

// A lock forces the switch ON. A released lock leaves it ON (R6), so this only
// ever turns protection on, never off.
export function applyLocks<T extends FieldInput>(field: T): T {
	let next = field;
	if (sensitiveLockOf(field) && field.sensitive !== true) {
		next = { ...next, sensitive: true };
	}
	if (field.type === "yes_no" && field.required) {
		next = { ...next, required: false };
	}
	return next;
}
