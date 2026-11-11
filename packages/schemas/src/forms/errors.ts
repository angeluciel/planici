// Error codes of SPEC-0001 §6 and SPEC-0002 §6, returned as { error, field? }.
// Append only; never reorder or rename.

export const FORM_ERROR_CODES = [
	"formName.required",
	"formName.max",
	"formName.taken",
	"formDescription.max",
	"formType.invalid",
	"includeArchived.invalid",
	"formType.immutable",
	"formFields.max",
	"form.limit-reached",
	"formRevision.required",
	"form.revision-conflict",
	"migration.mode-required",
	"migration.mode-invalid",
	"migration.confirmation-required",
	"form.not-found",
	"formVersion.not-found",
	"deleteConfirmation.required",
	"form.in-use",
	"form.records-have-history",
	"form.status-unchanged",
] as const;

export const FIELD_ERROR_CODES = [
	"fieldLabel.required",
	"fieldLabel.max",
	"fieldLabel.duplicate",
	"fieldType.invalid",
	"fieldType.immutable",
	"fieldSensitive.locked",
	"fieldSensitive.not-allowed",
	"fieldRequired.locked",
	"fieldHelpText.max",
	"fieldOptions.required",
	"fieldOptions.max",
	"fieldOptions.not-allowed",
	"fieldOptionLabel.required",
	"fieldOptionLabel.max",
	"fieldOptionLabel.duplicate",
	"fieldOptionId.unknown",
	"fieldOptionId.duplicate",
	"systemField.missing",
	"systemField.locked",
	"fieldSystemKey.not-allowed",
	"field.unknown",
	"fieldId.duplicate",
] as const;

export type FormErrorCode = (typeof FORM_ERROR_CODES)[number];
export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];
