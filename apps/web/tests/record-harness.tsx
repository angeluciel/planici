// Shared test harness for SPEC-0003 web tests (W-form, W-view).
// Builds on forms-harness (transport fake, renderApp, fixtures). The template and
// version reads go through the faked transport (/api/forms/:id and
// /api/forms/:id/versions/:version); only the record calls go through a fake
// RecordAdapter, as in a real mount where SPEC-0004/0005 own the record routes.
//
// vi.mock calls are hoisted per file, so each test file repeats the three
// factories (axios adapter, @/i18n/navigation, next/navigation).

import { getMessages } from "@planici/i18n";
import type { Field, FormTemplate } from "@planici/schemas";
import { createTranslator } from "next-intl";
import type { ComponentProps, ComponentType } from "react";
import { z } from "zod";
import type {
	RecordAdapter,
	SystemFieldConfig,
} from "@/app/[lang]/(private)/orgs/[tenant]/_components/records/record-adapter";
import { Input } from "@/components/ui/input";
import { FORM_ID, field, on, TENANT, template } from "./forms-harness";

export * from "./forms-harness";

// ------------------------------------------------------------- translators

type Translate = (key: string, values?: Record<string, unknown>) => string;

// A key that is not in the messages must fail the test loudly instead of
// comparing "clients.form.x" with "clients.form.x" rendered by a component.
function strict(namespace: string): Translate {
	const base = createTranslator({
		locale: "pt-BR",
		messages: getMessages("pt-BR"),
		namespace,
		onError: () => undefined,
		getMessageFallback: ({ namespace: ns, key }: never) =>
			`__MISSING__${ns}.${key}`,
	} as never) as unknown as Translate;
	return (key, values) => {
		const out = base(key, values);
		if (out.startsWith("__MISSING__"))
			throw new Error(`Missing copy key ${namespace}.${key}`);
		return out;
	};
}

export const tClients = strict("clients");
export const tServices = strict("services");

// ---------------------------------------------------------------- entities

export const ENTITIES = ["clients", "services"] as const;
export type Entity = (typeof ENTITIES)[number];

export const RECORD_ID = "9b2d7c1e-5a4f-4c8e-8a1b-3e6f7d8c9a0b";

type EntityConfig = {
	type: "client" | "service";
	tr: Translate;
	notFound: string; // 404 key of the entity (SPEC-0003 section 5)
	systemLabels: [string, string, string];
	systemRequired: [boolean, boolean, boolean];
	systemKeys: [string, string, string];
};

export const ENTITY: Record<Entity, EntityConfig> = {
	clients: {
		type: "client",
		tr: tClients,
		notFound: "client.not-found",
		systemLabels: ["Nome completo", "E-mail", "Telefone"],
		systemRequired: [true, true, false],
		systemKeys: ["client.name", "client.email", "client.phone"],
	},
	services: {
		type: "service",
		tr: tServices,
		notFound: "service.not-found",
		systemLabels: ["Nome", "Duração (minutos)", "Preço"],
		systemRequired: [true, true, true],
		systemKeys: ["service.name", "service.duration", "service.price"],
	},
};

/** The system fields of the entity's version, in default order. */
export function systemFieldsOf(entity: Entity): Field[] {
	const c = ENTITY[entity];
	const types =
		entity === "clients"
			? (["full_name", "email", "phone"] as const)
			: (["text", "duration", "money"] as const);
	return c.systemLabels.map((label, i) =>
		field({
			label,
			type: types[i] as Field["type"],
			required: c.systemRequired[i],
			requiredLock: c.systemRequired[i] && entity === "clients" && i < 2,
			systemKey: c.systemKeys[i],
		}),
	);
}

/** A template of the entity's type: its system fields, then `customs`. Pass the same `system` fields to keep ids across versions. */
export function entityTemplate(
	entity: Entity,
	customs: Field[],
	over: Partial<FormTemplate> = {},
	system: Field[] = systemFieldsOf(entity),
): FormTemplate {
	return template({
		type: ENTITY[entity].type,
		fields: [...system, ...customs],
		...over,
	});
}

/** The `{ version, fields }` read of SPEC-0001 section 7. */
export function versionBody(version: number, fields: Field[]) {
	return { version, fields };
}

export function serveTemplateOf(tpl: FormTemplate) {
	on("GET", `/api/forms/${tpl.id}`, { status: 200, body: tpl });
}

export function serveVersion(
	version: number,
	fields: Field[],
	formId = FORM_ID,
) {
	on("GET", `/api/forms/${formId}/versions/${version}`, {
		status: 200,
		body: versionBody(version, fields),
	});
}

// ---------------------------------------------------------- system fields
// The test `systemFields` config. Inputs are `Input`s that show the error in
// `help`, the way the real ones do. The form passes the final label (with "*").

export type SystemInputProps = ComponentProps<SystemFieldConfig["input"]>;

const text = (): ComponentType<SystemInputProps> =>
	function TextSystemInput({ id, label, value, onChange, status, help }) {
		return (
			<Input
				id={id}
				label={label}
				value={value == null ? "" : String(value)}
				status={status}
				help={help}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	};

const numeric = (
	toInput: (v: number) => string,
	fromInput: (s: string) => number,
): ComponentType<SystemInputProps> =>
	function NumericSystemInput({ id, label, value, onChange, status, help }) {
		return (
			<Input
				id={id}
				label={label}
				inputMode="decimal"
				value={typeof value === "number" ? toInput(value) : ""}
				status={status}
				help={help}
				onChange={(e) =>
					onChange(e.target.value === "" ? null : fromInput(e.target.value))
				}
			/>
		);
	};

const nameSchema = z
	.string({ error: "value.required" })
	.trim()
	.min(1, { error: "value.required" });

export function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m}min`;
	return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatPrice(cents: number): string {
	return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const asText = (v: unknown) => (v == null ? "" : String(v));

export const TEST_SYSTEM_FIELDS: Record<
	Entity,
	Record<string, SystemFieldConfig>
> = {
	clients: {
		"client.name": {
			attribute: "name",
			input: text(),
			schema: nameSchema,
			format: asText,
		},
		"client.email": {
			attribute: "email",
			input: text(),
			schema: z
				.string({ error: "email.required" })
				.trim()
				.min(1, { error: "email.required" })
				.regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { error: "email.invalid" }),
			format: asText,
		},
		"client.phone": {
			attribute: "phone",
			input: text(),
			schema: z
				.string()
				.trim()
				.regex(/^$|^\(\d{2}\) \d{4,5}-\d{4}$/, { error: "phone.invalid" })
				.nullish(),
			format: asText,
		},
	},
	services: {
		"service.name": {
			attribute: "name",
			input: text(),
			schema: nameSchema,
			format: asText,
		},
		"service.duration": {
			attribute: "durationMinutes",
			input: numeric(String, Number),
			schema: z
				.number({ error: "value.required" })
				.int({ error: "value.invalid" })
				.positive({ error: "value.invalid" }),
			format: (v) => (typeof v === "number" ? formatDuration(v) : ""),
		},
		"service.price": {
			attribute: "priceCents",
			input: numeric(
				(cents) => String(cents / 100),
				(s) => Math.round(Number(s.replace(",", ".")) * 100),
			),
			schema: z
				.number({ error: "value.required" })
				.int({ error: "value.invalid" })
				.nonnegative({ error: "value.invalid" }),
			format: (v) => (typeof v === "number" ? formatPrice(v) : ""),
		},
	},
};

/** The typed values that make a new record's system fields valid. */
export const VALID_SYSTEM: Record<Entity, [label: string, typed: string][]> = {
	clients: [
		["Nome completo", "Ana Souza"],
		["E-mail", "ana@example.com"],
	],
	services: [
		["Nome", "Corte"],
		["Duração (minutos)", "90"],
		["Preço", "150"],
	],
};

/** The system attributes of a stored record. */
export const SYSTEM_ATTRIBUTES: Record<Entity, Record<string, unknown>> = {
	clients: { name: "Ana Souza", email: "ana@example.com", phone: null },
	services: { name: "Corte", durationMinutes: 90, priceCents: 15000 },
};

// ------------------------------------------------------------ fake adapter

export type TestRecord = {
	id: string;
	form: {
		id: string;
		name: string;
		version: number;
		latestVersion: number;
		status: "active" | "archived";
	};
	revision: number;
	values: Record<string, unknown>;
	missingRequired: string[];
	status: "active" | "inactive";
	createdAt: string;
	updatedAt: string;
} & Record<string, unknown>;

export type Failure = { ok: false; error: string; field?: string };
export type RecordResult = { ok: true; record: TestRecord } | Failure;

export function record(
	entity: Entity,
	over: Partial<TestRecord> = {},
): TestRecord {
	return {
		id: RECORD_ID,
		form: {
			id: FORM_ID,
			name: "Ficha",
			version: 1,
			latestVersion: 1,
			status: "active",
		},
		revision: 3,
		values: {},
		missingRequired: [],
		status: "active",
		createdAt: "2026-11-01T12:00:00.000Z",
		updatedAt: "2026-11-01T12:00:00.000Z",
		...SYSTEM_ATTRIBUTES[entity],
		...over,
	};
}

export type FakeAdapter = {
	adapter: RecordAdapter;
	/** Requests the component sent, in order. */
	log: {
		creates: Record<string, unknown>[];
		updates: { id: string; body: Record<string, unknown> }[];
		reads: string[];
		saveErrors: Failure[];
	};
	/** Replace to script the next calls. */
	state: {
		create: (body: Record<string, unknown>) => Promise<RecordResult>;
		update: (
			id: string,
			body: Record<string, unknown>,
		) => Promise<RecordResult>;
		read: (id: string) => Promise<RecordResult>;
		onSaveError?: (error: Failure) => boolean;
	};
};

export function fakeAdapter(entity: Entity): FakeAdapter {
	const c = ENTITY[entity];
	const log: FakeAdapter["log"] = {
		creates: [],
		updates: [],
		reads: [],
		saveErrors: [],
	};
	const state: FakeAdapter["state"] = {
		create: async (body) => ({
			ok: true,
			record: record(entity, {
				form: {
					id: String(body.formId ?? FORM_ID),
					name: "Ficha",
					version: Number(body.formVersion ?? 1),
					latestVersion: Number(body.formVersion ?? 1),
					status: "active",
				},
				revision: 1,
				values: (body.values ?? {}) as Record<string, unknown>,
			}),
		}),
		update: async (_id, body) => ({
			ok: true,
			record: record(entity, {
				revision: Number(body.revision ?? 1) + 1,
				values: (body.values ?? {}) as Record<string, unknown>,
			}),
		}),
		read: async () => ({ ok: false, error: c.notFound }),
	};
	const adapter: RecordAdapter = {
		entity,
		type: c.type,
		create: (body) => {
			log.creates.push(body as Record<string, unknown>);
			return state.create(body as Record<string, unknown>) as never;
		},
		update: (id, body) => {
			log.updates.push({ id, body: body as Record<string, unknown> });
			return state.update(id, body as Record<string, unknown>) as never;
		},
		read: (id) => {
			log.reads.push(id);
			return state.read(id) as never;
		},
		viewHref: (id) => `/orgs/${TENANT}/${entity}/${id}`,
		editHref: (id) => `/orgs/${TENANT}/${entity}/${id}/edit`,
		listHref: `/orgs/${TENANT}/${entity}`,
		systemFields: TEST_SYSTEM_FIELDS[entity],
		onSaveError: (error) => {
			log.saveErrors.push(error as Failure);
			return state.onSaveError?.(error as Failure) ?? false;
		},
	};
	return { adapter, log, state };
}

// -------------------------------------------------------------- DOM helpers

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a field's label with or without the required marker. */
export const labelRe = (label: string) =>
	new RegExp(`^${escapeRe(label)}(\\s*\\*)?$`);

/** The text of the elements an input points to with aria-describedby. */
export function describedText(el: Element): string {
	return (el.getAttribute("aria-describedby") ?? "")
		.split(" ")
		.map((id) => document.getElementById(id)?.textContent ?? "")
		.join(" ")
		.trim();
}

export const pageText = () => document.body.textContent ?? "";
