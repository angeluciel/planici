import { z } from "zod";
import { EmailSchema } from "../common.js";
import { CursorQuerySchema, LimitQuerySchema } from "../pagination.js";
import { PhoneValueSchema, RecordCreateEnvelopeSchema, RecordUpdateEnvelopeSchema } from "../records/index.js";

// Request schemas of SPEC-0004 §6 and §7. The API parses a create or update body
// in parts, in §6 order (envelope, consent, attributes); the composed request
// schemas below are the web app's types and follow the same first-issue order.

export const CLIENT_NAME_MAX_LENGTH = 120;
export const CLIENT_SEARCH_MIN_LENGTH = 2;
export const CLIENT_STATUSES = ["active", "inactive"] as const;
export const CLIENT_STATUS_FILTERS = ["active", "inactive", "all"] as const;

// a malformed id names a client that cannot exist: 404, not 422 (AC-0004-73)
export const ClientIdSchema = z.uuid({ error: "client.not-found" });

// R2
export const ClientNameSchema = z
	.string({ error: "clientName.required" })
	.transform((name) => name.trim().replace(/\s+/g, " "))
	.pipe(z.string().min(1, { error: "clientName.required" }).max(CLIENT_NAME_MAX_LENGTH, { error: "clientName.max" }));

// R3
export const ClientEmailSchema = EmailSchema;

// R4: missing, null or blank is no phone; anything else follows SPEC-0003 §3.1
export const ClientPhoneSchema = z
	.unknown()
	.optional()
	.transform((value, ctx) => {
		if (value === undefined || value === null) return null;
		if (typeof value === "string" && value.trim() === "") return null;

		const phone = PhoneValueSchema.safeParse(value);
		if (phone.success) return phone.data;

		ctx.addIssue({ code: "custom", message: "phone.invalid" });
		return z.NEVER;
	});

// §6 step 2: name, then e-mail, then phone format (key order is issue order)
export const ClientAttributesSchema = z.object({
	name: ClientNameSchema,
	email: ClientEmailSchema,
	phone: ClientPhoneSchema,
});

// R12 on create: `consentAttested` must be the literal true
export const ClientConsentCreateSchema = z.object({
	consentAttested: z.literal(true, { error: "consentAttested.required" }),
	consentTextVersion: z
		.string({ error: "consentTextVersion.required" })
		.min(1, { error: "consentTextVersion.required" }),
});

// R12 on update: the attestation is given once and never changes
export const ClientConsentUpdateSchema = z.object({
	consentAttested: z.undefined({ error: "consentAttested.not-allowed" }).optional(),
	consentTextVersion: z.undefined({ error: "consentTextVersion.not-allowed" }).optional(),
});

const FieldIdSchema = z.uuid();

// every `values` key must be a well-formed field id (SPEC-0003 §6 step 1)
function checkValueKeys(data: { values: Record<string, unknown> }, ctx: z.RefinementCtx) {
	for (const key of Object.keys(data.values)) {
		if (FieldIdSchema.safeParse(key).success) continue;
		ctx.addIssue({ code: "custom", message: "value.unknown-field", path: ["values", key] });
		return;
	}
}

// the envelopes of SPEC-0003 with the consent and the attributes; the API uses
// the envelope schemas and the parts above instead, in §6 order
export const ClientCreateRequestSchema = z
	.object({
		...RecordCreateEnvelopeSchema.shape,
		...ClientConsentCreateSchema.shape,
		...ClientAttributesSchema.shape,
	})
	.superRefine(checkValueKeys);

export const ClientUpdateRequestSchema = z
	.object({
		...RecordUpdateEnvelopeSchema.shape,
		...ClientConsentUpdateSchema.shape,
		...ClientAttributesSchema.shape,
	})
	.superRefine(checkValueKeys);

// GET /clients?q&status&limit&after. Key order is the check order (§6, List).
export const ListClientsQuerySchema = z.object({
	// R9: trimmed; blank is no filter; one character is too short
	q: z
		.string({ error: "clientSearch.min" })
		.transform((q) => q.trim())
		.pipe(
			z.string().refine((q) => q === "" || [...q].length >= CLIENT_SEARCH_MIN_LENGTH, {
				error: "clientSearch.min",
			}),
		)
		.transform((q) => (q === "" ? undefined : q))
		.optional(),
	status: z.enum(CLIENT_STATUS_FILTERS, { error: "clientStatus.invalid" }).default("active"),
	limit: LimitQuerySchema,
	after: CursorQuerySchema,
});

// POST /clients/:clientId/delete; the comparison with the name is the API's (R8)
export const DeleteClientRequestSchema = z.object({
	confirmName: z.string().optional(),
});

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type ClientStatusFilter = (typeof CLIENT_STATUS_FILTERS)[number];
export type ClientAttributesInput = z.input<typeof ClientAttributesSchema>;
export type ClientAttributesData = z.output<typeof ClientAttributesSchema>;
export type ClientCreateRequestInput = z.input<typeof ClientCreateRequestSchema>;
export type ClientCreateRequestData = z.output<typeof ClientCreateRequestSchema>;
export type ClientUpdateRequestInput = z.input<typeof ClientUpdateRequestSchema>;
export type ClientUpdateRequestData = z.output<typeof ClientUpdateRequestSchema>;
export type ListClientsQueryInput = z.input<typeof ListClientsQuerySchema>;
export type ListClientsQueryData = z.output<typeof ListClientsQuerySchema>;
export type DeleteClientRequestInput = z.input<typeof DeleteClientRequestSchema>;
export type DeleteClientRequestData = z.output<typeof DeleteClientRequestSchema>;
