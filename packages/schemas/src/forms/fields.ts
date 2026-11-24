import { z } from "zod";

export const FIELD_TYPES = [
	"text",
	"long_text",
	"number",
	"date",
	"yes_no",
	"select",
	"email",
	"phone",
	"cpf",
	"full_name",
	"address",
	"duration",
	"money",
] as const;

// system-only types are never offered for custom fields
export const SYSTEM_ONLY_FIELD_TYPES = ["duration", "money"] as const;

export const CUSTOM_FIELD_TYPES = FIELD_TYPES.filter(
	(type) => !(SYSTEM_ONLY_FIELD_TYPES as readonly string[]).includes(type),
) as readonly Exclude<(typeof FIELD_TYPES)[number], (typeof SYSTEM_ONLY_FIELD_TYPES)[number]>[];

export const FORM_TYPES = ["client", "service"] as const;

// system fields of each template type, in default order (SPEC-0001 §3.2)
export const SYSTEM_KEYS = {
	client: ["client.name", "client.email", "client.phone"],
	service: ["service.name", "service.duration", "service.price"],
} as const;

export const SYSTEM_KEY_FIELD_TYPES = {
	"client.name": "full_name",
	"client.email": "email",
	"client.phone": "phone",
	"service.name": "text",
	"service.duration": "duration",
	"service.price": "money",
} as const;

export const FIELD_LABEL_MAX_LENGTH = 80;
export const FIELD_HELP_TEXT_MAX_LENGTH = 200;
export const FIELD_OPTION_LABEL_MAX_LENGTH = 80;
export const FIELD_SENSITIVE_LOCKS = ["type", "label"] as const;

export const FieldTypeSchema = z.enum(FIELD_TYPES, { error: "fieldType.invalid" });

const FieldLabelSchema = z
	.string({ error: "fieldLabel.required" })
	.trim()
	.min(1, { error: "fieldLabel.required" })
	.max(FIELD_LABEL_MAX_LENGTH, { error: "fieldLabel.max" });

const FieldOptionLabelSchema = z
	.string({ error: "fieldOptionLabel.required" })
	.trim()
	.min(1, { error: "fieldOptionLabel.required" })
	.max(FIELD_OPTION_LABEL_MAX_LENGTH, { error: "fieldOptionLabel.max" });

// ids and systemKey are plain strings: whether they exist or belong to the
// template is a FieldPolicy rule, not a contract rule
export const FieldOptionInputSchema = z.object({
	id: z.string().optional(),
	label: FieldOptionLabelSchema,
});

// request (SPEC-0002 §7)
export const FieldInputSchema = z.object({
	id: z.string().optional(),
	label: FieldLabelSchema,
	type: FieldTypeSchema,
	required: z.boolean().optional(),
	sensitive: z.boolean().optional(),
	helpText: z.string().max(FIELD_HELP_TEXT_MAX_LENGTH, { error: "fieldHelpText.max" }).nullish(),
	options: z.array(FieldOptionInputSchema).optional(),
	systemKey: z.string().optional(),
});

// response (SPEC-0002 §7)
export const FieldSchema = z.object({
	id: z.string(),
	label: z.string(),
	type: z.enum(FIELD_TYPES),
	required: z.boolean(),
	sensitive: z.boolean(),
	sensitiveLock: z.enum(FIELD_SENSITIVE_LOCKS).nullable(),
	requiredLock: z.boolean(),
	helpText: z.string().nullable(),
	options: z.array(z.object({ id: z.string(), label: z.string() })).nullable(),
	systemKey: z.string().nullable(),
	valueCount: z.number().int().nonnegative(),
});

export type FieldType = (typeof FIELD_TYPES)[number];
export type FormType = (typeof FORM_TYPES)[number];
export type SystemKey = (typeof SYSTEM_KEYS)[FormType][number];
export type FieldSensitiveLock = (typeof FIELD_SENSITIVE_LOCKS)[number];
export type FieldInput = z.input<typeof FieldInputSchema>;
export type FieldInputData = z.output<typeof FieldInputSchema>;
export type Field = z.infer<typeof FieldSchema>;
