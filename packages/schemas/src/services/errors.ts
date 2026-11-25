// New error codes of SPEC-0005 §6, returned as { error, field? }.
// `deleteConfirmation.required`, `formId.invalid`, `limit.invalid` and
// `cursor.invalid` already exist and are reused (`limit.invalid` and
// `cursor.invalid` are repeated here, as in CLIENT_ERROR_CODES).
// Append only; never reorder or rename.

export const SERVICE_ERROR_CODES = [
	"serviceName.required",
	"serviceName.max",
	"serviceName.taken",
	"serviceDuration.required",
	"serviceDuration.invalid",
	"servicePrice.required",
	"servicePrice.negative",
	"servicePrice.invalid",
	"serviceCurrency.required",
	"serviceCurrency.invalid",
	"service.not-found",
	"service.has-history",
	"service.status-unchanged",
	"serviceSearch.min",
	"serviceStatus.invalid",
	"serviceSort.invalid",
	"limit.invalid",
	"cursor.invalid",
] as const;

export type ServiceErrorCode = (typeof SERVICE_ERROR_CODES)[number];
