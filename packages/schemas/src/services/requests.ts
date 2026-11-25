import { z } from "zod";
import { CursorQuerySchema, LimitQuerySchema } from "../pagination.js";
import { RecordCreateEnvelopeSchema, RecordFormIdSchema, RecordUpdateEnvelopeSchema } from "../records/index.js";

// Request schemas of SPEC-0005 §6 and §7. The API parses a create or update body
// in parts, in §6 order (envelope, attributes); the composed request schemas
// below are the web app's types and follow the same first-issue order.

export const SERVICE_NAME_MAX_LENGTH = 80;
export const SERVICE_DURATION_MIN = 5;
export const SERVICE_DURATION_MAX = 1440;
// R5: R$ 999.999,99 in centavos
export const SERVICE_PRICE_MAX_CENTS = 99_999_999;
export const SERVICE_SEARCH_MIN_LENGTH = 2;
export const SERVICE_CURRENCY = "BRL";
export const SERVICE_STATUSES = ["active", "inactive"] as const;
export const SERVICE_STATUS_FILTERS = ["active", "inactive", "all"] as const;
// R11: the first one is the default; a leading `-` means descending
export const SERVICE_SORTS = ["name", "-name", "-updatedAt", "form"] as const;

// a malformed id names a service that cannot exist: 404, not 422
export const ServiceIdSchema = z.uuid({ error: "service.not-found" });

// R2
export const ServiceNameSchema = z
	.string({ error: "serviceName.required" })
	.transform((name) => name.trim().replace(/\s+/g, " "))
	.pipe(
		z.string().min(1, { error: "serviceName.required" }).max(SERVICE_NAME_MAX_LENGTH, { error: "serviceName.max" }),
	);

// R4: whole minutes, 5-1,440
export const ServiceDurationSchema = z
	.number({ error: (issue) => (issue.input === undefined ? "serviceDuration.required" : "serviceDuration.invalid") })
	.int({ error: "serviceDuration.invalid" })
	.min(SERVICE_DURATION_MIN, { error: "serviceDuration.invalid" })
	.max(SERVICE_DURATION_MAX, { error: "serviceDuration.invalid" });

// R5: integer centavos, 0 to R$ 999.999,99. Negative integers are `negative`;
// anything else out of shape or range is `invalid`.
export const ServicePriceCentsSchema = z
	.number({ error: (issue) => (issue.input === undefined ? "servicePrice.required" : "servicePrice.invalid") })
	.refine((cents) => !Number.isFinite(cents) || cents >= 0, { error: "servicePrice.negative" })
	.refine((cents) => Number.isInteger(cents), { error: "servicePrice.invalid" })
	.refine((cents) => cents <= SERVICE_PRICE_MAX_CENTS, { error: "servicePrice.invalid" });

// R5: the request names the currency; only BRL is accepted
export const ServiceCurrencySchema = z.literal(SERVICE_CURRENCY, {
	error: (issue) => (issue.input === undefined ? "serviceCurrency.required" : "serviceCurrency.invalid"),
});

// §6 step 1 (after the envelope): name, then duration, then price, then currency
export const ServiceAttributesSchema = z.object({
	name: ServiceNameSchema,
	durationMinutes: ServiceDurationSchema,
	priceCents: ServicePriceCentsSchema,
	currency: ServiceCurrencySchema,
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

// the envelopes of SPEC-0003 with the attributes; the API uses the envelope
// schemas and the attributes separately, in §6 order
export const ServiceCreateRequestSchema = z
	.object({
		...RecordCreateEnvelopeSchema.shape,
		...ServiceAttributesSchema.shape,
	})
	.superRefine(checkValueKeys);

export const ServiceUpdateRequestSchema = z
	.object({
		...RecordUpdateEnvelopeSchema.shape,
		...ServiceAttributesSchema.shape,
	})
	.superRefine(checkValueKeys);

// GET /services?q&status&formId&sort&limit&after. Key order is the check order
// (SPEC-0005 §6, List).
export const ListServicesQuerySchema = z.object({
	// R9: trimmed; blank is no filter; one character is too short
	q: z
		.string({ error: "serviceSearch.min" })
		.transform((q) => q.trim())
		.pipe(
			z.string().refine((q) => q === "" || [...q].length >= SERVICE_SEARCH_MIN_LENGTH, {
				error: "serviceSearch.min",
			}),
		)
		.transform((q) => (q === "" ? undefined : q))
		.optional(),
	status: z.enum(SERVICE_STATUS_FILTERS, { error: "serviceStatus.invalid" }).default("active"),
	// R11: malformed -> formId.invalid
	formId: RecordFormIdSchema.optional(),
	sort: z.enum(SERVICE_SORTS, { error: "serviceSort.invalid" }).default("name"),
	limit: LimitQuerySchema,
	after: CursorQuerySchema,
});

// POST /services/:serviceId/delete; the comparison with the name is the API's (R8)
export const DeleteServiceRequestSchema = z.object({
	confirmName: z.string().optional(),
});

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
export type ServiceStatusFilter = (typeof SERVICE_STATUS_FILTERS)[number];
export type ServiceSort = (typeof SERVICE_SORTS)[number];
export type ServiceAttributesInput = z.input<typeof ServiceAttributesSchema>;
export type ServiceAttributesData = z.output<typeof ServiceAttributesSchema>;
export type ServiceCreateRequestInput = z.input<typeof ServiceCreateRequestSchema>;
export type ServiceCreateRequestData = z.output<typeof ServiceCreateRequestSchema>;
export type ServiceUpdateRequestInput = z.input<typeof ServiceUpdateRequestSchema>;
export type ServiceUpdateRequestData = z.output<typeof ServiceUpdateRequestSchema>;
export type ListServicesQueryInput = z.input<typeof ListServicesQuerySchema>;
export type ListServicesQueryData = z.output<typeof ListServicesQuerySchema>;
export type DeleteServiceRequestInput = z.input<typeof DeleteServiceRequestSchema>;
export type DeleteServiceRequestData = z.output<typeof DeleteServiceRequestSchema>;
