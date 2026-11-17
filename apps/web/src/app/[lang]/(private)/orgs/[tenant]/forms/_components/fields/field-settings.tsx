"use client";

import type { Field, FieldType } from "@planici/schemas";
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import {
	FieldTextInputs,
	type RowErrors,
	TypeChangeWarning,
} from "./field-card/field-card";
import { changeType, type DraftField } from "./field-model";
import { FieldOptionsEditor } from "./field-options-editor";
import { requiredLocked, sensitiveLockOf } from "./field-protection";
import { FieldTypeSelect } from "./field-type-select";
import { RemoveFieldDialog } from "./remove-field-dialog";

type Props = {
	field: DraftField;
	// the published field this card was loaded from, or the one it replaced
	published: Field | undefined;
	errors: RowErrors;
	baseId: string;
	index: number;
	count: number;
	// records with an answer to this field; removing one with answers asks first
	answers: number;
	onChange: (next: DraftField) => void;
	onMove: (to: number) => void;
	onRemove: () => void;
};

function ErrorText({
	id,
	children,
}: Readonly<{ id: string; children: string }>) {
	return (
		<p
			id={id}
			role="alert"
			className="px-1 font-body-sm font-medium text-text-status-danger"
		>
			{children}
		</p>
	);
}

// `label` names the switch; `extra` sits after it and is not part of the name
function SwitchRow({
	labelId,
	label,
	extra,
	children,
}: Readonly<{
	labelId: string;
	label: string;
	extra?: ReactNode;
	children: ReactNode;
}>) {
	return (
		<div className="flex min-h-9 items-center gap-2 px-1 font-body-sm">
			<span className="flex flex-1 items-center gap-1">
				<span id={labelId}>{label}</span>
				{extra}
			</span>
			{children}
		</div>
	);
}

// The content of "Configurações do campo" (SPEC-0002 §4.6 step 4), in the
// popover on wide screens and in the sheet on narrow ones: the label, the
// description and the options first, then the settings. The locks are the
// row's: §4.2, §4.3, R3, R4 and R8.
export function FieldSettings({
	field,
	published,
	errors,
	baseId,
	index,
	count,
	answers,
	onChange,
	onMove,
	onRemove,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const system = Boolean(field.systemKey);
	const lock = sensitiveLockOf(field);
	const requiredFixed = requiredLocked(field);
	const helpOn = field.helpText !== null && field.helpText !== undefined;
	const sensitiveOn = lock !== null || field.sensitive === true;
	const [confirming, setConfirming] = useState(false);

	const ids = {
		required: `${baseId}-required`,
		requiredError: `${baseId}-required-error`,
		help: `${baseId}-help`,
		sensitive: `${baseId}-sensitive`,
		sensitiveHelp: `${baseId}-sensitive-help`,
		sensitiveLock: `${baseId}-sensitive-lock`,
		sensitiveError: `${baseId}-sensitive-error`,
		typeError: `${baseId}-type-error`,
		warning: `${baseId}-warning`,
		optionsError: `${baseId}-options-error`,
	};
	let lockCopy: string | null = null;
	if (lock === "type") lockCopy = t("sensitiveLockedType");
	else if (lock === "label") lockCopy = t("sensitiveLockedLabel");

	const sensitiveDescribedBy = [
		ids.sensitiveHelp,
		lockCopy ? ids.sensitiveLock : null,
		errors.sensitive ? ids.sensitiveError : null,
	]
		.filter(Boolean)
		.join(" ");
	const typeDescribedBy =
		[errors.type ? ids.typeError : null, field.replaces ? ids.warning : null]
			.filter(Boolean)
			.join(" ") || undefined;

	function pickType(next: FieldType) {
		onChange(changeType(field, next, published));
	}

	const sensitiveSwitch = (
		<Switch
			data-error-slot="sensitive"
			aria-labelledby={ids.sensitive}
			aria-describedby={sensitiveDescribedBy}
			aria-disabled={lockCopy ? true : undefined}
			readOnly={Boolean(lockCopy)}
			checked={sensitiveOn}
			onCheckedChange={(checked) => onChange({ ...field, sensitive: checked })}
		/>
	);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex flex-col gap-2 pb-2">
				<FieldTextInputs
					field={field}
					errors={errors}
					baseId={baseId}
					onChange={onChange}
				/>
				{field.type === "select" && (
					<FieldOptionsEditor
						options={field.options ?? []}
						groupError={errors.options}
						groupErrorId={ids.optionsError}
						errorOf={errors.option}
						onChange={(options) => onChange({ ...field, options })}
					/>
				)}
			</div>

			<SwitchRow labelId={ids.required} label={t("required")}>
				<Switch
					data-error-slot="required"
					aria-labelledby={ids.required}
					aria-describedby={errors.required ? ids.requiredError : undefined}
					aria-disabled={requiredFixed ? true : undefined}
					readOnly={requiredFixed}
					checked={field.required === true}
					onCheckedChange={(checked) =>
						onChange({ ...field, required: checked })
					}
				/>
			</SwitchRow>
			{errors.required && (
				<ErrorText id={ids.requiredError}>{errors.required}</ErrorText>
			)}

			<SwitchRow labelId={ids.help} label={t("helpText")}>
				<Switch
					aria-labelledby={ids.help}
					checked={helpOn}
					onCheckedChange={(checked) =>
						onChange({
							...field,
							// OFF clears the text (Q17); ON starts an empty description
							helpText: checked ? (field.helpText ?? "") : null,
						})
					}
				/>
			</SwitchRow>

			{!system && (
				<>
					<SwitchRow
						labelId={ids.sensitive}
						label={t("sensitive")}
						extra={
							<Tooltip content={t("sensitiveHelp")}>
								<button
									type="button"
									aria-label={t("sensitiveInfo")}
									aria-describedby={ids.sensitiveHelp}
									className="flex size-6 cursor-help items-center justify-center rounded-full text-icon-subtle focus-visible:outline-2 focus-visible:outline-border-focused"
								>
									<InfoIcon aria-hidden="true" className="size-4" />
								</button>
							</Tooltip>
						}
					>
						{lockCopy ? (
							<Tooltip content={lockCopy}>
								<span className="inline-flex">{sensitiveSwitch}</span>
							</Tooltip>
						) : (
							sensitiveSwitch
						)}
					</SwitchRow>
					<span id={ids.sensitiveHelp} className="sr-only">
						{t("sensitiveHelp")}
					</span>
					{lockCopy && (
						<span id={ids.sensitiveLock} className="sr-only">
							{lockCopy}
						</span>
					)}
					{errors.sensitive && (
						<ErrorText id={ids.sensitiveError}>{errors.sensitive}</ErrorText>
					)}
				</>
			)}

			<FieldTypeSelect
				value={field.type}
				system={system}
				appearance="row"
				invalid={Boolean(errors.type)}
				describedBy={typeDescribedBy}
				triggerProps={{ "data-error-slot": "type" }}
				onChange={pickType}
			/>
			{errors.type && <ErrorText id={ids.typeError}>{errors.type}</ErrorText>}
			{field.replaces && <TypeChangeWarning id={ids.warning} />}

			<Menu label={t("move")} appearance="row">
				<MenuItem onSelect={() => onMove(index - 1)} disabled={index === 0}>
					{t("moveUp")}
				</MenuItem>
				<MenuItem
					onSelect={() => onMove(index + 1)}
					disabled={index >= count - 1}
				>
					{t("moveDown")}
				</MenuItem>
			</Menu>

			{!system && (
				<button
					type="button"
					onClick={() => {
						if (answers > 0) setConfirming(true);
						else onRemove();
					}}
					className="flex min-h-9 w-full cursor-pointer items-center rounded-md px-1 text-left font-body-sm text-text-status-danger hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
				>
					{t("remove")}
				</button>
			)}

			{/* inside the panel's tree, so it opens as a nested popup of the
			    modal panel; Cancel and Escape return focus to "Remover" */}
			{confirming && (
				<RemoveFieldDialog
					count={answers}
					onCancel={() => setConfirming(false)}
					onConfirm={() => {
						setConfirming(false);
						onRemove();
					}}
				/>
			)}
		</div>
	);
}
