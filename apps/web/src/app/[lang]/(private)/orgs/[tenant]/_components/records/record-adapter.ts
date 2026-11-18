import type { FormType, RecordBase } from "@planici/schemas";
import type { ComponentType } from "react";
import type { z } from "zod";
import type { FieldStatus } from "@/components/ui/input";
import type { ApiFailure } from "@/lib/api/client";

// What an entity (SPEC-0004 clients, SPEC-0005 services) passes to the shared
// record components. The components own the form, the view and the version
// handling; the entity owns its routes, its API calls and its system fields.

/** A stored record: the shared part plus the entity's id, status and system attributes. */
export type RecordData = RecordBase & { id: string } & Record<string, unknown>;

export type RecordResult = { ok: true; record: RecordData } | ApiFailure;

/** The request body: `formId`/`revision`, `formVersion`, `values`, the system attributes and the extra fields. */
export type RecordRequest = Record<string, unknown>;

export type SystemInputProps = {
	id: string;
	// final label, required marker included
	label: string;
	value: unknown;
	onChange: (value: unknown) => void;
	status?: FieldStatus;
	// the error message, or the field's help text when there is no error
	help?: string;
	required?: boolean;
	disabled?: boolean;
};

export type SystemFieldConfig = {
	// the request attribute: `name`, `email`, `phone`, `durationMinutes`, `priceCents`
	attribute: string;
	input: ComponentType<SystemInputProps>;
	// parses the typed value (blank arrives as null); its output goes in the request
	schema: z.ZodType;
	// the view's text for the stored attribute
	format: (value: unknown) => string;
};

export type RecordAdapter = {
	entity: "clients" | "services";
	type: FormType;
	create: (body: RecordRequest) => Promise<RecordResult>;
	update: (id: string, body: RecordRequest) => Promise<RecordResult>;
	read: (id: string) => Promise<RecordResult>;
	viewHref: (id: string) => string;
	editHref: (id: string) => string;
	listHref: string;
	// by the version field's `systemKey`, e.g. `client.email`
	systemFields: Record<string, SystemFieldConfig>;
	// return true when the entity handled the error itself (e.g. 409 consentText.outdated)
	onSaveError?: (error: ApiFailure) => boolean;
};
