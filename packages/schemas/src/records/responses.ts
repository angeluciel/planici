import { z } from "zod";
import { FORM_STATUSES } from "../forms/responses.js";
import { AddressValueSchema } from "./values.js";

// Record part of the response (SPEC-0003 §7). The entity of SPEC-0004 and
// SPEC-0005 adds `id`, its system attributes and `status`.

// text, long_text, full_name, email, phone, cpf, date and select: string;
// number: number; yes_no: boolean; address: object
export const RecordValueSchema = z.union([z.string(), z.number(), z.boolean(), AddressValueSchema]);

export const RecordFormRefSchema = z.object({
	id: z.string(),
	name: z.string(),
	// the version the record is linked to
	version: z.number().int().positive(),
	// the template's latest version
	latestVersion: z.number().int().positive(),
	status: z.enum(FORM_STATUSES),
});

export const RecordBaseSchema = z.object({
	form: RecordFormRefSchema,
	revision: z.number().int().positive(),
	// custom fields of the linked version that have a value, by field id; a
	// yes_no without a value is false
	values: z.record(z.string(), RecordValueSchema),
	// ids of the required fields of the linked version without a value
	missingRequired: z.array(z.string()),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type RecordValue = z.infer<typeof RecordValueSchema>;
export type RecordFormRef = z.infer<typeof RecordFormRefSchema>;
export type RecordBase = z.infer<typeof RecordBaseSchema>;
