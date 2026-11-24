import { z } from "zod";
import { FieldSchema, FORM_TYPES } from "./fields.js";

export const FORM_STATUSES = ["active", "archived"] as const;
export const FORM_CHANGE_KINDS = ["required", "options", "position"] as const;

const FormIdentitySchema = {
	id: z.string(),
	type: z.enum(FORM_TYPES),
	name: z.string(),
	description: z.string().nullable(),
	status: z.enum(FORM_STATUSES),
	version: z.number().int().positive(),
	recordCount: z.number().int().nonnegative(),
	recordsWithHistory: z.number().int().nonnegative(),
};

// POST/GET/PATCH /forms, archive and unarchive
export const FormTemplateSchema = z.object({
	...FormIdentitySchema,
	revision: z.number().int().positive(),
	recordsOnOlderVersions: z.number().int().nonnegative(),
	fields: z.array(FieldSchema),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const FormTemplateSummarySchema = z.object({
	...FormIdentitySchema,
	fieldCount: z.number().int().nonnegative(),
	updatedAt: z.iso.datetime(),
});

// GET /forms
export const FormListResponseSchema = z.object({
	forms: z.array(FormTemplateSummarySchema),
});

// GET /forms/:formId/versions/:version
export const FormVersionResponseSchema = z.object({
	version: z.number().int().positive(),
	fields: z.array(FieldSchema),
});

// POST /forms/:formId/preview
export const FormChangePreviewResponseSchema = z.object({
	schemaChanged: z.boolean(),
	nextVersion: z.number().int().positive(),
	recordCount: z.number().int().nonnegative(),
	recordsLosingAnswers: z.number().int().nonnegative(),
	recordsGainingRequiredFields: z.number().int().nonnegative(),
	added: z.array(z.object({ label: z.string(), type: z.string(), required: z.boolean() })),
	removed: z.array(z.object({ id: z.string(), label: z.string(), valueCount: z.number().int().nonnegative() })),
	changed: z.array(
		z.object({
			id: z.string(),
			label: z.string(),
			changes: z.array(z.enum(FORM_CHANGE_KINDS)).min(1),
		}),
	),
});

export type FormStatus = (typeof FORM_STATUSES)[number];
export type FormChangeKind = (typeof FORM_CHANGE_KINDS)[number];
export type FormTemplate = z.infer<typeof FormTemplateSchema>;
export type FormTemplateSummary = z.infer<typeof FormTemplateSummarySchema>;
export type FormListResponse = z.infer<typeof FormListResponseSchema>;
export type FormVersionResponse = z.infer<typeof FormVersionResponseSchema>;
export type FormChangePreviewResponse = z.infer<typeof FormChangePreviewResponseSchema>;
