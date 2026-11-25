import { z } from "zod";
import { FORM_STATUSES } from "../forms/responses.js";
import { RecordBaseSchema } from "../records/index.js";
import { SERVICE_CURRENCY, SERVICE_STATUSES } from "./requests.js";

// Responses of SPEC-0005 §7. `priceCents` is an integer in centavos with
// `currency` beside it (api-convention.md, Money).

export const ServiceStatusSchema = z.enum(SERVICE_STATUSES);

export const ServiceSchema = RecordBaseSchema.extend({
	id: z.string(),
	name: z.string(),
	durationMinutes: z.number().int(),
	priceCents: z.number().int(),
	currency: z.literal(SERVICE_CURRENCY),
	status: ServiceStatusSchema,
	hasHistory: z.boolean(),
});

export const ServiceSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	durationMinutes: z.number().int(),
	priceCents: z.number().int(),
	currency: z.literal(SERVICE_CURRENCY),
	formId: z.string(),
	formName: z.string(),
	status: ServiceStatusSchema,
	// R11: the service's last update time
	updatedAt: z.iso.datetime(),
	// R15: whether the service has linked history
	hasHistory: z.boolean(),
});

export const ServiceListResponseSchema = z.object({
	services: z.array(ServiceSummarySchema),
	nextCursor: z.string().nullable(),
	// R11: matching services, regardless of limit and after
	total: z.number().int().nonnegative(),
});

// GET /services/templates: the narrow chips (R14)
export const ServiceTemplateSummarySchema = z.object({
	templates: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			status: z.enum(FORM_STATUSES),
			activeCount: z.number().int().nonnegative(),
		}),
	),
	archivedCount: z.number().int().nonnegative(),
});

export type ServiceResponse = z.infer<typeof ServiceSchema>;
export type ServiceSummary = z.infer<typeof ServiceSummarySchema>;
export type ServiceListResponse = z.infer<typeof ServiceListResponseSchema>;
export type ServiceTemplateSummary = z.infer<typeof ServiceTemplateSummarySchema>;
