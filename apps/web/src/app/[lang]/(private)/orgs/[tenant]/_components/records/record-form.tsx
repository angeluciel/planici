"use client";

import { ADDRESS_PARTS, type AddressPart, type Field } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { LeaveDialog } from "../../forms/_components/leave-dialog";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";
import { FieldInput } from "./field-input";
import { type RecordFormProps, useRecordForm } from "./use-record-form";

// Fill-in page of a new record and edit page of an existing one (SPEC-0003
// §4.1, §4.3). The entity's route mounts it with its own adapter.
export function RecordForm(props: Readonly<RecordFormProps>) {
	const { adapter, extraFields } = props;
	const t = useTranslations(adapter.entity);
	const form = useRecordForm(props);
	const { load } = form;

	if (load.status === "loading") {
		return (
			<div className={PAGE}>
				<output
					aria-label={t("form.loading")}
					aria-busy="true"
					className="flex flex-col gap-3"
				>
					{[0, 1, 2].map((row) => (
						<Skeleton key={row} className="h-12 w-full" />
					))}
				</output>
			</div>
		);
	}

	if (load.status === "error") {
		return (
			<div className={PAGE}>
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("form.loadError")}</Alert>
					<Button
						variant="subtle"
						text={t("form.retry")}
						className="w-auto"
						onPress={form.retry}
					/>
				</div>
			</div>
		);
	}

	if (load.status === "unavailable" || load.status === "notFound") {
		return (
			<div className={PAGE}>
				<div className="flex flex-col items-start gap-3">
					<p className="font-body-md text-text-primary">
						{t(
							load.status === "notFound" ? "form.notFound" : "form.unavailable",
						)}
					</p>
					<BackLink href={adapter.listHref} label={t("form.back")} />
				</div>
			</div>
		);
	}

	const { guard, saving } = form;

	return (
		<form
			noValidate
			className={PAGE}
			onSubmit={(event) => {
				event.preventDefault();
				void form.submit();
			}}
		>
			<header className="flex flex-col gap-1">
				{props.mode === "create" && (
					<h1 className="font-heading-lg text-text-primary">
						{t("form.newTitle")}
					</h1>
				)}
				<p className="font-body-sm text-text-secondary">
					{t("form.subtitle", { name: load.template.name })}
				</p>
			</header>

			{form.summaryCount > 0 && (
				<Alert>{t("form.errorSummary", { count: form.summaryCount })}</Alert>
			)}
			{form.banner === "formChanged" && (
				<Alert tone="info">{t("form.formChanged")}</Alert>
			)}
			{form.banner === "saveError" && <Alert>{t("form.saveError")}</Alert>}
			{form.banner === "revisionConflict" && (
				<div className="flex flex-wrap items-center gap-3">
					<div className="min-w-0 flex-1">
						<Alert>{t("form.revisionConflict")}</Alert>
					</div>
					<Button
						variant="subtle"
						text={t("form.reload")}
						className="w-auto"
						onPress={() => void form.reload()}
					/>
				</div>
			)}

			<div className="flex flex-col gap-4">
				{load.fields.map((field) => (
					<RecordField key={field.id} field={field} form={form} props={props} />
				))}
			</div>

			{extraFields?.render({
				values: form.draft.extra,
				onChange: form.setExtra,
				error: (name) => form.error(`extra.${name}`),
				idFor: form.extraId,
				disabled: saving,
			})}

			<div className="flex justify-end gap-2">
				<Button
					variant="subtle"
					text={t("form.cancel")}
					className="w-auto"
					disabled={saving}
					onPress={form.cancel}
				/>
				<Button
					type="submit"
					variant="primary"
					text={saving ? t("form.saving") : t("form.save")}
					className="w-auto"
					leadingIcon={saving ? SpinnerIcon : undefined}
					disabled={saving}
					aria-busy={saving}
				/>
			</div>

			<LeaveDialog
				guard={guard}
				discardKey={`${adapter.entity}.form.discardConfirm`}
			/>
		</form>
	);
}

const PAGE = "mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6";

function BackLink({ href, label }: Readonly<{ href: string; label: string }>) {
	return (
		<Link
			href={href}
			className="font-body-sm text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
		>
			{label}
		</Link>
	);
}

function RecordField({
	field,
	form,
	props,
}: Readonly<{
	field: Field;
	form: ReturnType<typeof useRecordForm>;
	props: RecordFormProps;
}>) {
	const { adapter } = props;
	const { saving } = form;
	// a yes_no is never required (SPEC-0002 R8)
	const label = `${field.label}${field.required && field.type !== "yes_no" ? " *" : ""}`;

	if (field.systemKey !== null) {
		const config = adapter.systemFields[field.systemKey];
		if (!config) return null;
		const SystemInput = config.input;
		const error = form.error(`system.${config.attribute}`);
		return (
			<SystemInput
				id={form.systemId(config.attribute)}
				label={label}
				value={form.draft.system[config.attribute]}
				onChange={(value) => form.setSystem(config.attribute, value)}
				status={error ? "error" : "default"}
				help={error ?? field.helpText ?? undefined}
				required={field.required}
				disabled={saving}
			/>
		);
	}

	const partErrors: Partial<Record<AddressPart, string>> = {};
	if (field.type === "address") {
		for (const part of ADDRESS_PARTS) {
			const message = form.error(`values.${field.id}.${part}`);
			if (message) partErrors[part] = message;
		}
	}

	return (
		<FieldInput
			id={form.customId(field.id)}
			field={field}
			label={label}
			entity={adapter.entity}
			value={form.draft.values[field.id]}
			onChange={(value) => form.setCustom(field.id, value)}
			error={form.error(`values.${field.id}`)}
			partErrors={partErrors}
			disabled={saving}
		/>
	);
}
