import {
	type Field,
	type FieldInput,
	type FormTemplate,
	type FormType,
	SYSTEM_KEY_FIELD_TYPES,
	SYSTEM_KEYS,
} from "@planici/schemas";

// The draft is what the editor holds until [Salvar]. Fields are the request
// shape (FieldInput), so saving sends them as they are.
export type FormDraft = {
	type: FormType | "";
	name: string;
	description: string;
	fields: FieldInput[];
};

// Default labels of the system fields (SPEC-0001 §3.2). They are stored with
// the template, so they are data, not UI copy: they are not translated.
const SYSTEM_FIELD_LABELS: Record<string, string> = {
	"client.name": "Nome completo",
	"client.email": "E-mail",
	"client.phone": "Telefone",
	"service.name": "Nome",
	"service.duration": "Duração (minutos)",
	"service.price": "Preço",
};

// every system field is required except the client's phone (§3.2)
const OPTIONAL_SYSTEM_KEYS = new Set(["client.phone"]);

export function systemFieldsFor(type: FormType): FieldInput[] {
	return SYSTEM_KEYS[type].map((systemKey) => ({
		label: SYSTEM_FIELD_LABELS[systemKey] ?? systemKey,
		type: SYSTEM_KEY_FIELD_TYPES[systemKey],
		required: !OPTIONAL_SYSTEM_KEYS.has(systemKey),
		systemKey,
	}));
}

// changing the type before the first save replaces the system fields and
// keeps the custom ones (§4.2 step 3)
export function swapSystemFields(
	fields: readonly FieldInput[],
	type: FormType,
): FieldInput[] {
	return [
		...systemFieldsFor(type),
		...fields.filter((field) => !field.systemKey),
	];
}

function toFieldInput(field: Field): FieldInput {
	return {
		id: field.id,
		label: field.label,
		type: field.type,
		required: field.required,
		...(field.sensitive ? { sensitive: true } : {}),
		...(field.helpText === null ? {} : { helpText: field.helpText }),
		...(field.options === null
			? {}
			: {
					options: field.options.map(({ id, label }) => ({ id, label })),
				}),
		...(field.systemKey === null ? {} : { systemKey: field.systemKey }),
	};
}

export function draftFromTemplate(template: FormTemplate): FormDraft {
	return {
		type: template.type,
		name: template.name,
		description: template.description ?? "",
		fields: template.fields.map(toFieldInput),
	};
}

export function blankDraft(type?: FormType): FormDraft {
	return {
		type: type ?? "",
		name: "",
		description: "",
		fields: type ? systemFieldsFor(type) : [],
	};
}

// Request shape of the fields. `systemKey` only goes on a create (fields
// without an id): an update that sends it is rejected (422
// fieldSystemKey.not-allowed). `sensitive` is never sent on a system field.
export function toRequestFields(fields: readonly FieldInput[]): FieldInput[] {
	return fields.map((field) => {
		const { systemKey, sensitive, ...rest } = field;
		return {
			...rest,
			...(sensitive && !systemKey ? { sensitive } : {}),
			...(systemKey && !field.id ? { systemKey } : {}),
		};
	});
}
