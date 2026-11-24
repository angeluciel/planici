import { z } from "zod";
import { FieldInputSchema, FORM_TYPES } from "./fields.js";

export const FORM_NAME_MAX_LENGTH = 80;
export const FORM_DESCRIPTION_MAX_LENGTH = 500;
export const FORM_FIELDS_MAX = 100;
export const MIGRATION_MODES = ["keep", "update_all"] as const;

// failures map to 404 form.not-found / formVersion.not-found at the API boundary
export const FormIdSchema = z.uuid({ error: "form.not-found" });
// canonical positive integers only: "0x10", "1e0" and " 2" are not versions
export const FormVersionParamSchema = z
	.string({ error: "formVersion.not-found" })
	.regex(/^[1-9][0-9]*$/, { error: "formVersion.not-found" })
	.transform(Number)
	.pipe(z.number().int().safe({ error: "formVersion.not-found" }));

export const FormTypeSchema = z.enum(FORM_TYPES, { error: "formType.invalid" });

export const FormNameSchema = z
	.string({ error: "formName.required" })
	.transform((name) => name.trim().replace(/\s+/g, " "))
	.pipe(z.string().min(1, { error: "formName.required" }).max(FORM_NAME_MAX_LENGTH, { error: "formName.max" }));

export const FormDescriptionSchema = z
	.string({ error: "formDescription.max" })
	.trim()
	.max(FORM_DESCRIPTION_MAX_LENGTH, { error: "formDescription.max" })
	.transform((description) => (description === "" ? null : description));

const FormFieldsSchema = z
	.array(FieldInputSchema, { error: "formFields.max" })
	.max(FORM_FIELDS_MAX, { error: "formFields.max" });

const RevisionSchema = z
	.number({ error: "formRevision.required" })
	.int({ error: "formRevision.required" })
	.positive({ error: "formRevision.required" });

// a create request without a usable `fields` list lacks the system fields
const CreateFormFieldsSchema = z
	.array(FieldInputSchema, { error: "systemField.missing" })
	.max(FORM_FIELDS_MAX, { error: "formFields.max" });

// POST /forms
export const CreateFormRequestSchema = z.object({
	type: FormTypeSchema,
	name: FormNameSchema,
	description: FormDescriptionSchema.nullish(),
	fields: CreateFormFieldsSchema,
});

// PATCH /forms/:formId
export const UpdateFormRequestSchema = z.object({
	// the type never changes after creation
	type: z.never({ error: "formType.immutable" }).optional(),
	revision: RevisionSchema,
	name: FormNameSchema.optional(),
	description: FormDescriptionSchema.nullish(),
	fields: FormFieldsSchema.optional(),
	migration: z
		.object({
			mode: z.enum(MIGRATION_MODES, { error: "migration.mode-invalid" }),
			confirmName: z.string().optional(),
		})
		.optional(),
});

// POST /forms/:formId/preview
export const PreviewFormChangesRequestSchema = z.object({
	revision: RevisionSchema,
	fields: FormFieldsSchema,
});

// GET /forms?type&includeArchived
export const ListFormsQuerySchema = z.object({
	type: FormTypeSchema.optional(),
	includeArchived: z
		.enum(["true", "false"], { error: "includeArchived.invalid" })
		.default("false")
		.transform((value) => value === "true"),
});

// POST /forms/:formId/delete
export const DeleteFormRequestSchema = z.object({
	deleteRecords: z.boolean().optional(),
	confirmName: z.string().optional(),
});

export type MigrationMode = (typeof MIGRATION_MODES)[number];
export type CreateFormRequestInput = z.input<typeof CreateFormRequestSchema>;
export type CreateFormRequestData = z.output<typeof CreateFormRequestSchema>;
export type UpdateFormRequestInput = z.input<typeof UpdateFormRequestSchema>;
export type UpdateFormRequestData = z.output<typeof UpdateFormRequestSchema>;
export type PreviewFormChangesRequestInput = z.input<typeof PreviewFormChangesRequestSchema>;
export type PreviewFormChangesRequestData = z.output<typeof PreviewFormChangesRequestSchema>;
export type ListFormsQueryInput = z.input<typeof ListFormsQuerySchema>;
export type ListFormsQueryData = z.output<typeof ListFormsQuerySchema>;
export type DeleteFormRequestInput = z.input<typeof DeleteFormRequestSchema>;
export type DeleteFormRequestData = z.output<typeof DeleteFormRequestSchema>;
