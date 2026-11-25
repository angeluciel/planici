"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ADDRESS_PARTS,
	type Field,
	type FormType,
	recordValuesSchema,
} from "@planici/schemas";
import { useTranslations } from "next-intl";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type FieldErrors,
	get,
	type Resolver,
	useForm,
	useWatch,
} from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/ui/toast";
import { type LeaveGuard, useLeaveGuard } from "@/hooks/use-leave-guard";
import { useRouter } from "@/i18n/navigation";
import type { ApiFailure } from "@/lib/api/client";
import { getForm, getFormVersion } from "@/lib/api/forms";
import { useFieldError } from "@/lib/form";
import { emptyValue, inputToValue, valueToInput } from "./field-value";
import { useNumberText } from "./format-value";
import type {
	RecordAdapter,
	RecordData,
	RecordRequest,
	RecordResult,
} from "./record-adapter";
import { remapValues } from "./remap-values";

// State of the fill-in and edit page (SPEC-0003 §4.1, §4.3, §4.4): loading the
// template or record, the typed values (react-hook-form), validation with the
// shared schemas through zodResolver, the save and every rejected save.

/** Inputs the entity adds above [Salvar], e.g. SPEC-0004's consent checkbox. */
export type ExtraFields = {
	// typed values at load, keyed by the request attribute
	initial: Record<string, unknown>;
	// parses the typed values; its output is spread into the request
	schema: z.ZodType<Record<string, unknown>>;
	render: (api: {
		values: Record<string, unknown>;
		onChange: (name: string, value: unknown) => void;
		// the translated error of an input, if any
		error: (name: string) => string | undefined;
		idFor: (name: string) => string;
		disabled: boolean;
	}) => ReactNode;
};

export type RecordFormProps = {
	adapter: RecordAdapter;
	extraFields?: ExtraFields;
} & ({ mode: "create"; formId: string } | { mode: "edit"; recordId: string });

export type Draft = {
	// by request attribute
	system: Record<string, unknown>;
	// by field id
	values: Record<string, unknown>;
	extra: Record<string, unknown>;
};

export type Banner = "formChanged" | "revisionConflict" | "saveError" | null;

type Template = { id: string; name: string; version: number };

type Ready = {
	status: "ready";
	template: Template;
	fields: Field[];
	record: RecordData | null;
};
type Loaded =
	| { status: "unavailable" }
	| { status: "notFound" }
	| { status: "error" }
	| Ready;

export type Load =
	| { status: "loading" }
	| { status: "unavailable" }
	| { status: "notFound" }
	| { status: "error" }
	| {
			status: "ready";
			template: Template;
			fields: Field[];
			// the record's revision when editing
			revision: number | null;
			// the stored name of the record being edited (SPEC-0007 R5); null on create
			storedTitle: string | null;
	  };

const NOT_FOUND = /\.not-found$/;

async function fetchForCreate(formId: string, type: FormType): Promise<Loaded> {
	const result = await getForm(formId);
	if (!result.ok) {
		return {
			status: result.error === "form.not-found" ? "unavailable" : "error",
		};
	}
	const form = result.form;
	if (form.status === "archived" || form.type !== type) {
		return { status: "unavailable" };
	}
	return {
		status: "ready",
		template: { id: form.id, name: form.name, version: form.version },
		fields: form.fields,
		record: null,
	};
}

// The record, then the version it is linked to (not the latest, R2).
async function fetchForEdit(
	adapter: RecordAdapter,
	recordId: string,
): Promise<Loaded> {
	const read = await adapter.read(recordId);
	if (!read.ok) {
		return { status: NOT_FOUND.test(read.error) ? "notFound" : "error" };
	}
	const { record } = read;
	const version = await getFormVersion(record.form.id, record.form.version);
	if (!version.ok) return { status: "error" };
	return {
		status: "ready",
		template: {
			id: record.form.id,
			name: record.form.name,
			version: record.form.version,
		},
		fields: version.version.fields,
		record,
	};
}

function buildDraft(
	fields: readonly Field[],
	record: RecordData | null,
	adapter: RecordAdapter,
	extraInitial: Record<string, unknown>,
	numberText: (n: number) => string,
): Draft {
	const draft: Draft = { system: {}, values: {}, extra: { ...extraInitial } };

	for (const field of fields) {
		if (field.systemKey !== null) {
			const config = adapter.systemFields[field.systemKey];
			if (config)
				draft.system[config.attribute] = record?.[config.attribute] ?? null;
			continue;
		}
		draft.values[field.id] = valueToInput(
			field,
			record?.values[field.id],
			numberText,
		);
	}

	return draft;
}

const isBlank = (value: unknown) =>
	value === null ||
	value === undefined ||
	(typeof value === "string" && value.trim() === "");

const EMPTY_FIELDS: Field[] = [];

// One schema for the whole form: the adapter's system-field schemas (blank
// arrives as null), the shared custom-value schema, and the extra fields'.
function buildSchema(
	fields: readonly Field[],
	adapter: RecordAdapter,
	extraSchema: z.ZodType | undefined,
) {
	const system: Record<string, z.ZodType> = {};
	for (const field of fields) {
		if (field.systemKey === null) continue;
		const config = adapter.systemFields[field.systemKey];
		if (!config) continue;

		system[config.attribute] = z.unknown().transform((raw, ctx) => {
			const blank = isBlank(raw);
			const parsed = config.schema.safeParse(blank ? null : raw);
			if (!parsed.success) {
				ctx.issues.push({
					code: "custom",
					message: parsed.error.issues[0]?.message ?? "value.invalid",
					input: raw,
				});
				return z.NEVER;
			}
			if (field.required && blank) {
				ctx.issues.push({
					code: "custom",
					message: "value.required",
					input: raw,
				});
				return z.NEVER;
			}
			return parsed.data;
		});
	}

	const values = z.unknown().transform((raw, ctx) => {
		const typed = (raw ?? {}) as Record<string, unknown>;
		const wire: Record<string, unknown> = {};
		for (const field of fields) {
			if (field.systemKey === null) {
				wire[field.id] = inputToValue(field, typed[field.id]);
			}
		}
		const parsed = recordValuesSchema(fields).safeParse(wire);
		if (parsed.success) return parsed.data;
		for (const issue of parsed.error.issues) {
			ctx.issues.push({
				code: "custom",
				message: issue.message,
				path: issue.path,
				input: raw,
			});
		}
		return z.NEVER;
	});

	return z.object({
		system: z.object(system),
		values,
		extra: extraSchema ?? z.unknown(),
	});
}

type Output = {
	system: Record<string, unknown>;
	values: Record<string, unknown>;
	extra?: Record<string, unknown>;
};

export function useRecordForm(props: Readonly<RecordFormProps>) {
	const { adapter, extraFields } = props;
	const t = useTranslations(adapter.entity);
	const fieldError = useFieldError();
	const toast = useToast();
	const router = useRouter();
	const numberText = useNumberText();
	const baseId = useId();

	const [attempt, setAttempt] = useState(0);
	const [load, setLoad] = useState<Load>({ status: "loading" });
	const [summary, setSummary] = useState(false);
	const [banner, setBanner] = useState<Banner>(null);
	const [saving, setSaving] = useState(false);

	const fields = load.status === "ready" ? load.fields : EMPTY_FIELDS;
	const extraSchema = extraFields?.schema;
	const schema = useMemo(
		() => buildSchema(fields, adapter, extraSchema),
		[fields, adapter, extraSchema],
	);

	const form = useForm<Draft>({
		defaultValues: { system: {}, values: {}, extra: {} },
		resolver: zodResolver(schema as never) as unknown as Resolver<Draft>,
	});
	const { control, formState, getValues, reset, setValue, setError } = form;
	const { errors } = formState;
	const dirty = formState.isDirty;
	const draft = (useWatch({ control }) ?? {}) as Partial<Draft>;

	// what the effects and handlers read, so they do not depend on re-created props
	const latest = useRef({ props, numberText });
	latest.current = { props, numberText };

	const guard: LeaveGuard = useLeaveGuard({
		dirty,
		messageKey: `${adapter.entity}.form.discard`,
	});

	const target = props.mode === "create" ? props.formId : props.recordId;
	const mode = props.mode;

	const fetchCurrent = useCallback((): Promise<Loaded> => {
		const current = latest.current.props;
		return current.mode === "create"
			? fetchForCreate(current.formId, current.adapter.type)
			: fetchForEdit(current.adapter, current.recordId);
	}, []);

	const draftOf = useCallback(
		(loaded: Ready) =>
			buildDraft(
				loaded.fields,
				loaded.record,
				latest.current.props.adapter,
				latest.current.props.extraFields?.initial ?? {},
				latest.current.numberText,
			),
		[],
	);

	const ready = useCallback((loaded: Ready): Load => {
		const { adapter: current } = latest.current.props;
		const attribute = current.systemFields[current.titleField]?.attribute;
		const stored = attribute ? loaded.record?.[attribute] : undefined;
		return {
			status: "ready",
			template: loaded.template,
			fields: loaded.fields,
			revision: loaded.record?.revision ?? null,
			storedTitle: typeof stored === "string" ? stored : null,
		};
	}, []);

	// first load, retry, and a new target
	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the load on retry; `target` and `mode` identify what is loaded
	useEffect(() => {
		let live = true;
		setLoad({ status: "loading" });

		void fetchCurrent().then((loaded) => {
			if (!live) return;
			if (loaded.status !== "ready") {
				setLoad({ status: loaded.status });
				return;
			}
			reset(draftOf(loaded));
			setSummary(false);
			setBanner(null);
			setSaving(false);
			setLoad(ready(loaded));
		});

		return () => {
			live = false;
		};
	}, [attempt, target, mode, fetchCurrent, draftOf, ready, reset]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	// ----------------------------------------------------------- ids and focus

	const systemId = (attribute: string) => `${baseId}-s-${attribute}`;
	const customId = (fieldId: string) => `${baseId}-c-${fieldId}`;
	const extraId = (name: string) => `${baseId}-x-${name}`;

	// `values.<id>` is the CEP input of an address, which carries the field's id
	const domIdOf = (key: string): string => {
		const [kind, name, part] = key.split(".");
		if (kind === "system") return systemId(name ?? "");
		if (kind === "extra") return extraId(name ?? "");
		return part && part !== "cep"
			? `${customId(name ?? "")}-${part}`
			: customId(name ?? "");
	};

	const focusKey = (key: string) =>
		document.getElementById(domIdOf(key))?.focus();

	// A rejected save ends `saving` and names the input to focus in the same
	// tick, while the inputs are still disabled; focus it once they are enabled.
	const pendingFocus = useRef<string | null>(null);
	const [focusRequest, setFocusRequest] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `focusRequest` re-runs it for each rejected save; `focusKey` reads only the stable id
	useEffect(() => {
		if (saving || !pendingFocus.current) return;
		const key = pendingFocus.current;
		pendingFocus.current = null;
		focusKey(key);
	}, [saving, focusRequest]);

	// ------------------------------------------------------------------ edits

	const setSystem = (attribute: string, value: unknown) => {
		form.clearErrors(`system.${attribute}`);
		setValue(`system.${attribute}`, value, { shouldDirty: true });
	};

	const setCustom = (fieldId: string, value: unknown) => {
		form.clearErrors([
			`values.${fieldId}`,
			...ADDRESS_PARTS.map((part) => `values.${fieldId}.${part}` as const),
		]);
		setValue(`values.${fieldId}`, value, { shouldDirty: true });
	};

	const setExtra = (name: string, value: unknown) => {
		form.clearErrors(`extra.${name}`);
		setValue(`extra.${name}`, value, { shouldDirty: true });
	};

	// the first invalid input in the order the page shows them: the heading
	// input first, wherever the version places it (SPEC-0007 R6), then the list
	const firstInvalid = (
		found: FieldErrors<Draft>,
		list: readonly Field[],
	): string | null => {
		const has = (key: string) => Boolean(get(found, key));
		const isTitle = (field: Field) => field.systemKey === adapter.titleField;
		const ordered = [
			...list.filter(isTitle),
			...list.filter((f) => !isTitle(f)),
		];
		for (const field of ordered) {
			if (field.systemKey !== null) {
				const config = adapter.systemFields[field.systemKey];
				const key = config && `system.${config.attribute}`;
				if (key && has(key)) return key;
				continue;
			}
			const part = ADDRESS_PARTS.find((p) => has(`values.${field.id}.${p}`));
			if (part) return `values.${field.id}.${part}`;
			if (has(`values.${field.id}`)) return `values.${field.id}`;
		}
		const extra = Object.keys(found.extra ?? {})[0];
		return extra ? `extra.${extra}` : null;
	};

	// ----------------------------------------------------------- server errors

	// The input a rejected save's `field` names, as a form path
	const keyOfServerField = (
		field: string | undefined,
		list: readonly Field[],
	): string | null => {
		if (!field) return null;
		const custom = /^values\.([^.]+)(?:\.([^.]+))?$/.exec(field);
		if (custom) {
			const found = list.find(
				(f) => f.id === custom[1] && f.systemKey === null,
			);
			if (!found) return null;
			if (!custom[2]) return field;
			const isPart = (ADDRESS_PARTS as readonly string[]).includes(custom[2]);
			return found.type === "address" && isPart ? field : null;
		}
		const isSystem = list.some(
			(f) =>
				f.systemKey !== null &&
				adapter.systemFields[f.systemKey]?.attribute === field,
		);
		if (isSystem) return `system.${field}`;
		if (extraFields && field in extraFields.initial) return `extra.${field}`;
		return null;
	};

	// A changed template (R7, §4.4): reload the version the record now uses and
	// keep what was typed in the fields that are still there.
	const reloadForNewVersion = async () => {
		const loaded = await fetchCurrent();
		if (loaded.status === "unavailable" || loaded.status === "notFound") {
			setLoad({ status: loaded.status });
			return;
		}
		if (loaded.status === "error") {
			setBanner("saveError");
			return;
		}

		const typed = getValues();
		const fresh = draftOf(loaded);
		const kept = remapValues(typed.values, loaded.fields);
		const values: Record<string, unknown> = {};
		for (const field of loaded.fields) {
			if (field.systemKey !== null) continue;
			values[field.id] = field.id in kept ? kept[field.id] : emptyValue(field);
		}

		// the baseline is the fresh form, so what was typed still counts as dirty
		reset(fresh);
		reset(
			{
				system: { ...fresh.system, ...typed.system },
				values,
				extra: typed.extra,
			},
			{ keepDefaultValues: true },
		);
		setSummary(false);
		setBanner("formChanged");
		setLoad(ready(loaded));
	};

	// [Recarregar] after a revision conflict: the record as it is now, typed values gone
	const reload = async () => {
		const loaded = await fetchCurrent();
		if (loaded.status === "unavailable" || loaded.status === "notFound") {
			setLoad({ status: loaded.status });
			return;
		}
		if (loaded.status === "error") {
			setBanner("saveError");
			return;
		}
		reset(draftOf(loaded));
		setSummary(false);
		setBanner(null);
		setLoad(ready(loaded));
	};

	const routeFailure = async (failure: ApiFailure, list: readonly Field[]) => {
		if (failure.error === "record.form-changed") {
			await reloadForNewVersion();
			return;
		}
		if (failure.error === "record.revision-conflict") {
			setBanner("revisionConflict");
			return;
		}
		if (
			failure.error === "form.archived" ||
			failure.error === "formId.invalid"
		) {
			setLoad({ status: "unavailable" });
			return;
		}
		if (adapter.onSaveError?.(failure)) return;

		const key = keyOfServerField(failure.field, list);
		if (key) {
			setError(key as `values.${string}`, {
				type: "server",
				message: failure.error,
			});
			setSummary(false);
			pendingFocus.current = key;
			setFocusRequest((n) => n + 1);
			return;
		}
		setBanner("saveError");
	};

	// ----------------------------------------------------------------- submit

	const onInvalid = (found: FieldErrors<Draft>) => {
		setSummary(true);
		const first = firstInvalid(found, fields);
		if (first) focusKey(first);
	};

	const onValid = async (data: Draft) => {
		if (load.status !== "ready") return;
		const output = data as unknown as Output;
		const body: RecordRequest = {
			...output.system,
			values: output.values,
			...(extraFields ? output.extra : {}),
		};
		setSummary(false);
		setSaving(true);

		const request: RecordRequest =
			props.mode === "create"
				? { formId: props.formId, formVersion: load.template.version, ...body }
				: {
						revision: load.revision,
						formVersion: load.template.version,
						...body,
					};
		// an adapter that throws instead of resolving an ApiFailure must not leave
		// the form saving forever: it ends in the save error like a network failure
		const result: RecordResult = await (props.mode === "create"
			? adapter.create(request)
			: adapter.update(props.recordId, request)
		).catch(() => ({ ok: false, error: "network.unavailable" }) as const);

		if (!result.ok) {
			setSaving(false);
			await routeFailure(result, load.fields);
			return;
		}

		toast.show(t(props.mode === "create" ? "toast.created" : "toast.saved"));
		// reset first, so the guard sees a clean form and does not ask
		reset(getValues());
		guard.navigate((how) => router[how](adapter.viewHref(result.record.id)));
	};

	const submit = async () => {
		if (saving || load.status !== "ready") return;
		setBanner(null);
		await form.handleSubmit(onValid, onInvalid)();
	};

	const cancel = () =>
		guard.requestLeave(() =>
			guard.navigate((how) => router[how](adapter.listHref)),
		);

	// each child of system, values and extra is one invalid input
	const invalidCount =
		Object.keys(errors.system ?? {}).length +
		Object.keys(errors.values ?? {}).length +
		Object.keys(errors.extra ?? {}).length;

	return {
		load,
		draft: {
			system: draft.system ?? {},
			values: draft.values ?? {},
			extra: draft.extra ?? {},
		} as Draft,
		banner,
		saving,
		guard,
		summaryCount: summary ? invalidCount : 0,
		error: (key: string) =>
			fieldError(get(errors, key)?.message as string | undefined),
		systemId,
		customId,
		extraId,
		setSystem,
		setCustom,
		setExtra,
		submit,
		cancel,
		retry,
		reload,
	};
}
