// New error codes of SPEC-0004 §6, returned as { error, field? }.
// `email.required`, `email.invalid`, `phone.invalid` and
// `deleteConfirmation.required` already exist and are reused.
// Append only; never reorder or rename.

export const CLIENT_ERROR_CODES = [
	"consentAttested.required",
	"consentTextVersion.required",
	"consentText.outdated",
	"consentAttested.not-allowed",
	"consentTextVersion.not-allowed",
	"clientName.required",
	"clientName.max",
	"phone.required",
	"clientEmail.taken",
	"client.not-found",
	"client.has-history",
	"client.status-unchanged",
	"clientSearch.min",
	"clientStatus.invalid",
	"limit.invalid",
	"cursor.invalid",
	// SPEC-0006 §6
	"clientSort.invalid",
] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];
