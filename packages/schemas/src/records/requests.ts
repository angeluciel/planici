import { z } from "zod";

// Request envelopes of SPEC-0003 §6 step 1 and §7. They are loose objects: the
// system attributes and SPEC-0004's consent fields pass through and are parsed
// later, in SPEC-0004 §6 order. The first issue follows the order of the plan's
// Decision 12: the object fields in schema order, then (on update) `formId`,
// then each `values` key in request order.

const INT4_MAX = 2_147_483_647;

const positiveInt = (required: string, invalid: string) =>
	z
		.number({ error: (issue) => (issue.input === undefined ? required : invalid) })
		.int({ error: invalid })
		.positive({ error: invalid })
		.max(INT4_MAX, { error: invalid });

export const RecordFormIdSchema = z.uuid({
	error: (issue) => (issue.input === undefined ? "formId.required" : "formId.invalid"),
});

export const RecordFormVersionSchema = positiveInt("formVersion.required", "formVersion.invalid");

export const RecordRevisionSchema = positiveInt("recordRevision.required", "recordRevision.invalid");

// values stay `unknown` here: step 5 checks them against the version
export const RecordValuesInputSchema = z.record(z.string(), z.unknown(), { error: "values.invalid" });

const FieldIdSchema = z.uuid();

// every `values` key must be a well-formed field id (§6 step 1)
function checkValueKeys(data: { values: Record<string, unknown> }, ctx: z.RefinementCtx) {
	for (const key of Object.keys(data.values)) {
		if (FieldIdSchema.safeParse(key).success) continue;
		ctx.addIssue({ code: "custom", message: "value.unknown-field", path: ["values", key] });
		return;
	}
}

export const RecordCreateEnvelopeSchema = z
	.looseObject({
		formId: RecordFormIdSchema,
		formVersion: RecordFormVersionSchema,
		values: RecordValuesInputSchema,
	})
	.superRefine(checkValueKeys);

export const RecordUpdateEnvelopeSchema = z
	.looseObject({
		formVersion: RecordFormVersionSchema,
		revision: RecordRevisionSchema,
		values: RecordValuesInputSchema,
		// changing a record's template is post-MVP
		formId: z.undefined({ error: "formId.not-allowed" }).optional(),
	})
	.superRefine(checkValueKeys);

export type RecordCreateEnvelope = z.infer<typeof RecordCreateEnvelopeSchema>;
export type RecordUpdateEnvelope = z.infer<typeof RecordUpdateEnvelopeSchema>;
