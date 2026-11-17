import type { FieldErrorSlot } from "../field-error-target";
import type { DraftField } from "../field-model";

// translated messages of one card, by place (see field-error-target.ts)
export type RowErrors = {
	top?: string;
	label?: string;
	type?: string;
	required?: string;
	sensitive?: string;
	helpText?: string;
	options?: string;
	option: (index: number) => string | undefined;
};

// Where a message can be shown next to a control. Errors without one (§4.6
// step 9) go under the card title on wide screens and to a toast on narrow
// ones: the card as a whole, options on a type that has none, and
// "Dado protegido" on a system field, which has no such switch.
export function slotHasControl(
	slot: FieldErrorSlot,
	field: Pick<DraftField, "type" | "systemKey">,
): boolean {
	if (typeof slot === "object") return field.type === "select";
	if (slot === "top") return false;
	if (slot === "options") return field.type === "select";
	if (slot === "sensitive") return !field.systemKey;
	return true;
}

// the slots whose control sits in the settings panel on wide screens
export function isPanelSlot(slot: FieldErrorSlot): boolean {
	return slot === "required" || slot === "sensitive" || slot === "type";
}

type Placed = { slot: FieldErrorSlot; message: string };

// the card's messages in reading order
export function placedErrors(
	field: Pick<DraftField, "options">,
	errors: RowErrors,
): Placed[] {
	const list: Placed[] = [];
	const add = (slot: FieldErrorSlot, message: string | undefined) => {
		if (message) list.push({ slot, message });
	};
	add("top", errors.top);
	add("label", errors.label);
	add("type", errors.type);
	add("required", errors.required);
	add("sensitive", errors.sensitive);
	add("helpText", errors.helpText);
	add("options", errors.options);
	(field.options ?? []).forEach((_, j) => {
		add({ option: j }, errors.option(j));
	});
	return list;
}
