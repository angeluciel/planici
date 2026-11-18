// New error codes of SPEC-0003 §6, returned as { error, field? }.
// `email.invalid` already exists (auth). Append only; never reorder or rename.

export const RECORD_ERROR_CODES = [
	"formId.required",
	"formId.not-allowed",
	"formId.invalid",
	"formType.mismatch",
	"form.archived",
	"formVersion.required",
	"formVersion.invalid",
	"record.form-changed",
	"recordRevision.required",
	"recordRevision.invalid",
	"record.revision-conflict",
	"values.invalid",
	"value.required",
	"value.unknown-field",
	"value.invalid",
	"value.max",
	"number.invalid",
	"date.invalid",
	"option.invalid",
	"phone.invalid",
	"cpf.invalid",
	"cep.invalid",
	"uf.invalid",
	"address.incomplete",
] as const;

export type RecordErrorCode = (typeof RECORD_ERROR_CODES)[number];
