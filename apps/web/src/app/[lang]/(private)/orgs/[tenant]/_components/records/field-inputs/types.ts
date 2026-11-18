import type { AddressPart, Field } from "@planici/schemas";

// Shared by every custom-field input. `value` is the form's own value (text,
// boolean for `yes_no`, an object of text for `address`; see field-value.ts).
export type FieldInputProps = {
	id: string;
	field: Field;
	// the label with its required marker
	label: string;
	value: unknown;
	onChange: (value: unknown) => void;
	// translated error of the field, or of the whole address
	error?: string;
	// translated errors of the address parts
	partErrors?: Partial<Record<AddressPart, string>>;
	disabled?: boolean;
	// the entity's copy namespace, for the address part labels
	entity: string;
};
