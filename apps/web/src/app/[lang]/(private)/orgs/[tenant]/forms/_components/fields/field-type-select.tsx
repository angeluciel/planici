"use client";

import {
	CUSTOM_FIELD_TYPES,
	FIELD_TYPES,
	type FieldType,
} from "@planici/schemas";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

// Custom rows offer the custom types. System rows are locked to their own
// type, which may be a system-only one (duration, money).
export function FieldTypeSelect({
	value,
	system,
	onChange,
	invalid,
	describedBy,
}: Readonly<{
	value: FieldType;
	system: boolean;
	onChange: (type: FieldType) => void;
	invalid?: boolean;
	describedBy?: string;
}>) {
	const t = useTranslations("forms.fields");
	const types: readonly FieldType[] = system
		? FIELD_TYPES.filter((type) => type === value)
		: CUSTOM_FIELD_TYPES;

	return (
		<Select
			label={t("type")}
			value={value}
			disabled={system}
			invalid={invalid}
			describedBy={describedBy}
			options={types.map((type) => ({
				value: type,
				label: t(`types.${type}`),
			}))}
			onValueChange={(next) => {
				const type = FIELD_TYPES.find((candidate) => candidate === next);
				if (type) onChange(type);
			}}
		/>
	);
}
