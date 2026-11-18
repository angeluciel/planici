"use client";

import { AddressInput } from "./field-inputs/address-input";
import { LongTextInput } from "./field-inputs/long-text-input";
import { SelectInput } from "./field-inputs/select-input";
import { SimpleInput } from "./field-inputs/simple-input";
import type { FieldInputProps } from "./field-inputs/types";
import { YesNoInput } from "./field-inputs/yes-no-input";

// The input of one custom field, by its §3.1 type. `duration` and `money` are
// system-only (C-15): their inputs come from the adapter's `systemFields`.
export function FieldInput(props: Readonly<FieldInputProps>) {
	switch (props.field.type) {
		case "long_text":
			return <LongTextInput {...props} />;
		case "yes_no":
			return <YesNoInput {...props} />;
		case "select":
			return <SelectInput {...props} />;
		case "address":
			return <AddressInput {...props} />;
		default:
			return <SimpleInput {...props} />;
	}
}
