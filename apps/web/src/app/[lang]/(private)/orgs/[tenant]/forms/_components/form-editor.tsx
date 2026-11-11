"use client";

import {
	CreateFormRequestSchema,
	type FieldInput,
	FORM_TYPES,
	type FormChangePreviewResponse,
	type FormTemplate,
	type FormType,
	type MigrationMode,
	UpdateFormRequestSchema,
} from "@planici/schemas";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { type FieldPath, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import type { ApiFailure } from "@/lib/api/client";
import {
	archiveForm,
	createForm,
	getForm,
	previewFormChanges,
	unarchiveForm,
	updateForm,
} from "@/lib/api/forms";
import {
	blankDraft,
	draftFromTemplate,
	type FormDraft,
	swapSystemFields,
	toRequestFields,
} from "../_lib/draft";
import { isConflict } from "../_lib/failure";
import { ApplyDialog } from "./apply-dialog";
import { ArchiveDialog } from "./archive-dialog";
import { DeleteDialog } from "./delete-dialog";
import { fieldErrorPath, fieldErrorTarget } from "./fields/field-error-target";
import { FieldList } from "./fields/field-list";
import { LeaveDialog } from "./leave-dialog";
import { PublishDialog } from "./publish-dialog";
import { SpinnerIcon } from "./spinner-icon";
import { useFormDraft } from "./use-form-draft";

type Origin = "clients" | "services";

export type FormEditorProps = {
	// an existing template; without it the editor creates one
	formId?: string;
	// creating: preset type, locked when `from` is set (§4.3)
	type?: FormType;
	from?: Origin;
	// seed for the draft; the plan's test seam for the field list, which is
	// edited by SPEC-0002's controls
	initialDraft?: {
		type: FormType;
		name?: string;
		description?: string;
		fields: FieldInput[];
	};
};

type Load =
	| { status: "loading" }
	| { status: "error" }
	| { status: "notFound" }
	| { status: "ready"; template: FormTemplate };

export function FormEditor({
	formId,
	type,
	from,
	initialDraft,
}: Readonly<FormEditorProps>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const { tenant } = useParams<{ tenant: string }>();
	const [load, setLoad] = useState<Load>({ status: "loading" });
	const latest = useRef(0);

	const fetchTemplate = useCallback(async () => {
		if (!formId) return;
		latest.current += 1;
		const request = latest.current;
		setLoad({ status: "loading" });

		const result = await getForm(formId);
		if (request !== latest.current) return;

		if (result.ok) setLoad({ status: "ready", template: result.form });
		else if (result.error === "form.not-found") setLoad({ status: "notFound" });
		else setLoad({ status: "error" });
	}, [formId]);

	useEffect(() => {
		void fetchTemplate();
		return () => {
			latest.current += 1;
		};
	}, [fetchTemplate]);

	if (!formId) {
		return (
			<EditorBody
				template={null}
				type={type}
				from={from}
				initialDraft={initialDraft}
			/>
		);
	}

	if (load.status === "ready") {
		return (
			<EditorBody
				template={load.template}
				from={from}
				initialDraft={initialDraft}
			/>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
			{load.status === "loading" && (
				<output
					aria-label={t("editor.loading")}
					aria-busy="true"
					className="flex flex-col gap-6"
				>
					<Skeleton
						data-testid="form-header-skeleton"
						className="h-24 w-full"
					/>
					<div className="flex flex-col gap-3">
						{[0, 1, 2].map((index) => (
							<Skeleton
								key={index}
								data-testid="form-field-skeleton"
								className="h-12 w-full"
							/>
						))}
					</div>
				</output>
			)}
			{load.status === "error" && (
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("editor.loadError")}</Alert>
					<Button
						variant="subtle"
						text={t("actions.retry")}
						className="w-auto"
						onPress={() => void fetchTemplate()}
					/>
				</div>
			)}
			{load.status === "notFound" && (
				<div className="flex flex-col items-start gap-3">
					<p className="font-body-md text-text-primary">
						{t("editor.notFound")}
					</p>
					<Link
						href={`/orgs/${tenant}/forms`}
						className="font-body-sm text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
					>
						{tCommon("back")}
					</Link>
				</div>
			)}
		</div>
	);
}

type Banner =
	| { kind: "saveFailed" }
	| { kind: "conflict" }
	| { kind: "message"; text: string }
	| null;

type Dialog =
	| { kind: "publish"; preview: FormChangePreviewResponse; body: SaveBody }
	| { kind: "apply"; preview: FormChangePreviewResponse; body: SaveBody }
	| { kind: "archive" }
	| { kind: "delete" }
	| null;

type SaveBody = {
	revision: number;
	name?: string;
	description?: string | null;
	fields?: FieldInput[];
};

const TYPE_ID_SUFFIX = "type";

function EditorBody({
	template,
	type,
	from,
	initialDraft,
}: Readonly<{
	template: FormTemplate | null;
	type?: FormType;
	from?: Origin;
	initialDraft?: FormEditorProps["initialDraft"];
}>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const tValidation = useTranslations("validation");
	const router = useRouter();
	const toast = useToast();
	const { tenant } = useParams<{ tenant: string }>();
	const baseId = useId();
	const [current, setCurrent] = useState<FormTemplate | null>(template);
	const [saving, setSaving] = useState(false);
	const [banner, setBanner] = useState<Banner>(null);
	const [dialog, setDialog] = useState<Dialog>(null);
	const [unarchiving, setUnarchiving] = useState(false);

	const { form, dirty, guard } = useFormDraft(
		template
			? draftFromTemplate(template)
			: initialDraft
				? {
						type: initialDraft.type,
						name: initialDraft.name ?? "",
						description: initialDraft.description ?? "",
						fields: initialDraft.fields,
					}
				: blankDraft(type),
	);
	const {
		register,
		control,
		formState: { errors },
	} = form;
	const draftType = useWatch({ control, name: "type" });
	const typeLocked = Boolean(current) || Boolean(from);
	const base = `/orgs/${tenant}`;
	const leaveTarget = from ? `${base}/${from}` : `${base}/forms`;

	const text = useCallback(
		(key: string | undefined) =>
			key && tValidation.has(key) ? tValidation(key) : undefined,
		[tValidation],
	);

	// the saved template becomes the draft's baseline
	const adopt = useCallback(
		(saved: FormTemplate) => {
			setCurrent(saved);
			form.reset(draftFromTemplate(saved));
			setBanner(null);
		},
		[form],
	);

	function chooseType(next: FormType) {
		form.setValue("type", next, { shouldDirty: true });
		form.setValue("fields", swapSystemFields(form.getValues("fields"), next), {
			shouldDirty: true,
		});
		form.clearErrors("type");
	}

	function focusFirstError(keys: readonly string[]) {
		if (keys.includes("type")) {
			document.getElementById(`${baseId}-${TYPE_ID_SUFFIX}`)?.focus();
		} else if (keys.includes("name")) form.setFocus("name");
		else if (keys.includes("description")) form.setFocus("description");
	}

	// a message for a field-list path, shown where the plan puts it (see
	// fields/field-error-target.ts); false when the path is not a field's
	function showFieldError(
		path: string | readonly PropertyKey[] | undefined,
		message: string,
	): boolean {
		const target = fieldErrorTarget(path);
		if (!target) return false;
		form.setError(fieldErrorPath(target) as FieldPath<FormDraft>, {
			type: "server",
			message,
		});
		requestAnimationFrame(() =>
			document
				.querySelector<HTMLElement>(
					"li[aria-invalid=true] input, li[aria-invalid=true] [role=combobox]",
				)
				?.focus(),
		);
		return true;
	}

	// shape errors from the shared schema, shown next to their control
	function showIssues(
		issues: readonly { path: PropertyKey[]; message: string }[],
	) {
		const keys: string[] = [];
		for (const issue of issues) {
			const key = String(issue.path[0]);
			if (key === "type" || key === "name" || key === "description") {
				if (!keys.includes(key)) {
					keys.push(key);
					form.setError(key, { type: "validate", message: issue.message });
				}
			} else if (!showFieldError(issue.path, issue.message)) {
				setBanner({
					kind: "message",
					text: text(issue.message) ?? t("editor.saveFailed"),
				});
			}
		}
		focusFirstError(keys);
	}

	// server answers: returns true when the failure was shown outside a dialog
	function showFailure(failure: ApiFailure) {
		if (isConflict(failure)) {
			setBanner({ kind: "conflict" });
			return;
		}
		if (failure.error === "formName.taken") {
			form.setError("name", { type: "server", message: failure.error });
			focusFirstError(["name"]);
			return;
		}
		if (failure.field?.startsWith("fields") && failure.error) {
			if (showFieldError(failure.field, failure.error)) return;
		}
		if (failure.field === "description") {
			form.setError("description", { type: "server", message: failure.error });
			focusFirstError(["description"]);
			return;
		}
		const known =
			failure.error !== "unexpected" && failure.error !== "network.unavailable"
				? text(failure.error)
				: undefined;
		setBanner(
			known ? { kind: "message", text: known } : { kind: "saveFailed" },
		);
	}

	async function create(values: FormDraft) {
		const parsed = CreateFormRequestSchema.safeParse({
			type: values.type || undefined,
			name: values.name,
			description: values.description,
			fields: toRequestFields(values.fields),
		});
		if (!parsed.success) {
			showIssues(parsed.error.issues);
			return;
		}

		setSaving(true);
		const result = await createForm(parsed.data);
		setSaving(false);
		if (!result.ok) {
			showFailure(result);
			return;
		}

		adopt(result.form);
		toast.show(t("editor.published"));
		// from /clients or /services: straight to creating a record with it (§4.3)
		guard.navigate((mode) =>
			router[mode](
				from
					? `${base}/${from}/new?form=${result.form.id}`
					: `${base}/forms/${result.form.id}`,
			),
		);
	}

	async function update(saved: FormTemplate, values: FormDraft) {
		const parsed = UpdateFormRequestSchema.safeParse({
			revision: saved.revision,
			name: values.name,
			description: values.description,
			fields: toRequestFields(values.fields),
		});
		if (!parsed.success) {
			showIssues(parsed.error.issues);
			return;
		}
		const body: SaveBody = parsed.data;

		setSaving(true);
		const preview = await previewFormChanges(saved.id, {
			revision: saved.revision,
			fields: body.fields ?? [],
		});
		if (!preview.ok) {
			setSaving(false);
			showFailure(preview);
			return;
		}

		if (preview.preview.schemaChanged) {
			setSaving(false);
			setDialog({
				kind: preview.preview.recordCount > 0 ? "apply" : "publish",
				preview: preview.preview,
				body,
			});
			return;
		}

		// metadata only: the version stays (R14)
		const result = await updateForm(saved.id, body);
		setSaving(false);
		if (!result.ok) {
			showFailure(result);
			return;
		}
		adopt(result.form);
		toast.show(t("editor.saved"));
	}

	const submit = form.handleSubmit(async (values) => {
		setBanner(null);
		if (current) await update(current, values);
		else await create(values);
	});

	// Runs the publish (and the migration, for Apply). Resolves null when the
	// dialog should close or the failure was handled here, else an error code.
	async function publish(
		pending: SaveBody,
		migration?: { mode: MigrationMode; confirmName?: string },
	): Promise<string | null> {
		if (!current) return null;
		const result = await updateForm(current.id, {
			...pending,
			...(migration ? { migration } : {}),
		});

		if (result.ok) {
			adopt(result.form);
			toast.show(t("toast.versionPublished", { version: result.form.version }));
			setDialog(null);
			return null;
		}
		if (isConflict(result) || result.error === "formName.taken") {
			setDialog(null);
			showFailure(result);
			return null;
		}
		return result.error;
	}

	async function reload() {
		if (!current) return;
		const result = await getForm(current.id);
		if (result.ok) adopt(result.form);
		else setBanner({ kind: "saveFailed" });
	}

	async function unarchive() {
		if (!current) return;
		setUnarchiving(true);
		const result = await unarchiveForm(current.id);
		setUnarchiving(false);
		if (result.ok) {
			// status and revision change; the draft stays as it is
			setCurrent(result.form);
			toast.show(t("toast.unarchived"));
		} else {
			toast.show(t("unarchive.failed"), "danger");
		}
	}

	const archived = current?.status === "archived";
	const nameError = errors.name?.message;
	const descriptionError = errors.description?.message;
	const typeError = errors.type?.message;
	const descriptionId = `${baseId}-description`;

	return (
		<form
			noValidate
			onSubmit={(event) => {
				// server errors sit on unregistered paths; handleSubmit would skip
				// onValid while any remain, so they are dropped before it validates
				form.clearErrors("fields");
				return submit(event);
			}}
			className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6"
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading-md text-text-bold">
						{current ? current.name : t("actions.new")}
					</h1>
					{current && (
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
								{t("editor.version", { version: current.version })}
							</span>
							<span className="font-body-xs text-text-secondary">
								{t("editor.recordCounts", {
									current: Math.max(
										0,
										current.recordCount - current.recordsOnOlderVersions,
									),
									older: current.recordsOnOlderVersions,
								})}
							</span>
						</div>
					)}
				</div>
				{current && (
					<div className="flex gap-2">
						{!archived && (
							<Button
								variant="subtle"
								text={t("actions.archive")}
								className="w-auto"
								onPress={() => setDialog({ kind: "archive" })}
							/>
						)}
						<Button
							variant="subtle"
							text={t("actions.delete")}
							className="w-auto"
							onPress={() => setDialog({ kind: "delete" })}
						/>
					</div>
				)}
			</header>

			{archived && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-border-selected bg-background-status-information-subtler px-3 py-2">
					<p className="font-body-sm font-medium text-text-status-information-bolder">
						{t("editor.archived")}
					</p>
					<Button
						variant="subtle"
						text={t("actions.unarchive")}
						className="w-auto"
						leadingIcon={unarchiving ? SpinnerIcon : undefined}
						disabled={unarchiving}
						aria-busy={unarchiving}
						onPress={() => void unarchive()}
					/>
				</div>
			)}

			<fieldset
				className="flex flex-col gap-2"
				disabled={saving}
				aria-describedby={typeError ? `${baseId}-type-error` : undefined}
			>
				<legend className="pb-1 font-body-sm text-text-primary">
					{t("editor.type")}
				</legend>
				{typeLocked ? (
					<p className="font-body-sm text-text-bold">
						{draftType === "service"
							? t("editor.typeService")
							: t("editor.typeClient")}
					</p>
				) : (
					<div className="flex flex-wrap gap-4">
						{FORM_TYPES.map((option, index) => (
							<label
								key={option}
								className="flex cursor-pointer items-center gap-2 font-body-sm text-text-primary"
							>
								<input
									id={index === 0 ? `${baseId}-${TYPE_ID_SUFFIX}` : undefined}
									type="radio"
									name={`${baseId}-type`}
									value={option}
									checked={draftType === option}
									onChange={() => chooseType(option)}
									className="size-4 accent-background-brand-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
								/>
								{option === "client"
									? t("editor.typeClient")
									: t("editor.typeService")}
							</label>
						))}
					</div>
				)}
				{typeError && (
					<p
						id={`${baseId}-type-error`}
						role="alert"
						className="font-body-sm font-medium text-text-status-danger"
					>
						{text(typeError)}
					</p>
				)}
			</fieldset>

			<Input
				label={t("editor.name")}
				readOnly={saving}
				autoComplete="off"
				status={nameError ? "error" : "default"}
				help={text(nameError)}
				className="min-w-0"
				{...register("name")}
			/>

			<div className="flex flex-col">
				<label
					htmlFor={descriptionId}
					className="pb-1 font-body-sm text-text-primary"
				>
					{t("editor.description")}
				</label>
				<textarea
					id={descriptionId}
					rows={3}
					readOnly={saving}
					aria-invalid={descriptionError ? true : undefined}
					aria-describedby={
						descriptionError ? `${descriptionId}-error` : undefined
					}
					className="w-full rounded-md border-2 border-border-input bg-transparent px-2 py-2 font-body-sm text-text-bold focus:border-border-focused focus:outline-none"
					{...register("description")}
				/>
				{descriptionError && (
					<p
						id={`${descriptionId}-error`}
						role="alert"
						className="font-body-sm font-medium text-text-status-danger"
					>
						{text(descriptionError)}
					</p>
				)}
			</div>

			{/* field list: SPEC-0002 */}
			{draftType === "" ? (
				<p className="font-body-sm text-text-secondary">
					{t("editor.chooseType")}
				</p>
			) : (
				<FieldList
					form={form}
					original={current?.fields ?? []}
					text={text}
					errors={errors.fields}
				/>
			)}

			{banner?.kind === "saveFailed" && <Alert>{t("editor.saveFailed")}</Alert>}
			{banner?.kind === "message" && <Alert>{banner.text}</Alert>}
			{banner?.kind === "conflict" && (
				<div className="flex flex-wrap items-center gap-3">
					<div className="min-w-0 flex-1">
						<Alert>{t("editor.conflict")}</Alert>
					</div>
					<Button
						variant="subtle"
						text={t("actions.reload")}
						className="w-auto"
						onPress={() => void reload()}
					/>
				</div>
			)}
			{saving && (
				<output className="block font-body-sm text-text-secondary">
					{t("editor.saving")}
				</output>
			)}

			<div className="flex justify-end gap-2">
				<Button
					variant="subtle"
					text={tCommon("cancel")}
					className="w-auto"
					disabled={saving}
					onPress={() =>
						guard.requestLeave(() =>
							guard.navigate((mode) => router[mode](leaveTarget)),
						)
					}
				/>
				<Button
					type="submit"
					variant="primary"
					text={tCommon("save")}
					className="w-auto"
					leadingIcon={saving ? SpinnerIcon : undefined}
					disabled={saving || (Boolean(current) && !dirty)}
					aria-busy={saving}
				/>
			</div>

			<LeaveDialog guard={guard} discardKey="forms.editor.discard" />

			{current && dialog?.kind === "publish" && (
				<PublishDialog
					nextVersion={dialog.preview.nextVersion}
					onCancel={() => setDialog(null)}
					onPublish={() => publish(dialog.body)}
				/>
			)}
			{current && dialog?.kind === "apply" && (
				<ApplyDialog
					preview={dialog.preview}
					templateName={current.name}
					onCancel={() => setDialog(null)}
					onApply={(migration) => publish(dialog.body, migration)}
				/>
			)}
			{current && dialog?.kind === "archive" && (
				<ArchiveDialog
					onCancel={() => setDialog(null)}
					onArchive={async () => {
						const result = await archiveForm(current.id);
						if (!result.ok) return result.error;
						setCurrent(result.form);
						toast.show(t("toast.archived"));
						setDialog(null);
						return null;
					}}
				/>
			)}
			{current && dialog?.kind === "delete" && (
				<DeleteDialog
					subject={current}
					onCancel={() => setDialog(null)}
					onDeleted={() => {
						setDialog(null);
						guard.navigate((mode) => router[mode](`${base}/forms`));
					}}
					onArchived={(archivedForm) => {
						setCurrent(archivedForm);
						setDialog(null);
					}}
				/>
			)}
		</form>
	);
}
