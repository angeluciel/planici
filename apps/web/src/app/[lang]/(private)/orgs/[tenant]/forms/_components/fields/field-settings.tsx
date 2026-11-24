"use client";

import type { Field, FieldType } from "@planici/schemas";
import {
	AsteriskIcon,
	InfoIcon,
	type LucideIcon,
	TextAlignStartIcon,
} from "lucide-react";
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
	// the label and description inputs, on narrow screens only (§4.6 step 4)
	showTextInputs?: boolean;
	// a new field's label selects its text on its first focus (§4.1 step 2)
	selectOnFocus?: boolean;
	onSelected?: () => void;
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

// `label` names the switch, and a click on it toggles the switch; `extra` sits
// after it and is not part of the name
function SwitchRow({
	labelId,
	switchId,
	label,
	extra,
	children,
	Icon,
}: Readonly<{
	labelId: string;
	switchId: string;
	label: string;
	extra?: ReactNode;
	children: ReactNode;
	Icon?: LucideIcon;
}>) {
	return (
		<div className="flex items-center gap-1.5 rounded-md px-2 py-1 font-body-sm transition-colors duration-100 ease-out hover:bg-surface-overlay-hovered">
			<label
				htmlFor={switchId}
				id={labelId}
				className="flex flex-1 cursor-pointer select-none items-center gap-1.5 align-bottom"
			>
				<div className="size-5 text-icon flex items-center justify-center">
					{Icon && <Icon size={20} />}
				</div>
				<span className="text-text-bold">{label}</span>
			</label>
			{extra}
			{children}
		</div>
	);
}

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
	showTextInputs = true,
	selectOnFocus,
	onSelected,
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
		requiredSwitch: `${baseId}-required-switch`,
		requiredError: `${baseId}-required-error`,
		help: `${baseId}-help`,
		helpSwitch: `${baseId}-help-switch`,
		sensitive: `${baseId}-sensitive`,
		sensitiveSwitch: `${baseId}-sensitive-switch`,
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
			id={ids.sensitiveSwitch}
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
			<div className="flex flex-col gap-1 pb-2">
				{showTextInputs && (
					<FieldTextInputs
						field={field}
						errors={errors}
						baseId={baseId}
						selectOnFocus={selectOnFocus}
						onSelected={onSelected}
						onChange={onChange}
					/>
				)}
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

			<SwitchRow
				labelId={ids.required}
				label={t("required")}
				Icon={AsteriskIcon}
				switchId={ids.requiredSwitch}
			>
				<Switch
					id={ids.requiredSwitch}
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

			<SwitchRow
				labelId={ids.help}
				label={t("helpText")}
				Icon={TextAlignStartIcon}
				switchId={ids.helpSwitch}
			>
				<Switch
					id={ids.helpSwitch}
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
						switchId={ids.sensitiveSwitch}
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
