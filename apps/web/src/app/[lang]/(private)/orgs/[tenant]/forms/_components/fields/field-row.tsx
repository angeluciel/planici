"use client";

import type { Field, FieldType } from "@planici/schemas";
import { GripVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { changeType, type DraftField } from "./field-model";
import { FieldOptionsEditor } from "./field-options-editor";
import { requiredLocked, sensitiveLockOf } from "./field-protection";
import { FieldRowMenu } from "./field-row-menu";
import { FieldTypeSelect } from "./field-type-select";

// translated messages of one row, by place (see field-error-target.ts)
export type RowErrors = {
	top?: string;
	label?: string;
	type?: string;
	required?: string;
	sensitive?: string;
	helpText?: string;
	options?: string;
	option: (index: number) => string | undefined;
};

type Props = {
	field: DraftField;
	index: number;
	count: number;
	// the published field this row was loaded from, if any
	published: Field | undefined;
	errors: RowErrors;
	dragging: boolean;
	dragHandleProps: Record<string, unknown>;
	onChange: (next: DraftField) => void;
	onMove: (to: number) => void;
	onRemove: () => void;
};

export function FieldRow({
	field,
	index,
	count,
	published,
	errors,
	dragging,
	dragHandleProps,
	onChange,
	onMove,
	onRemove,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const baseId = useId();
	const system = Boolean(field.systemKey);
	const isSelect = field.type === "select";
	const lock = sensitiveLockOf(field);
	const requiredFixed = requiredLocked(field);
	const [helpOpen, setHelpOpen] = useState(Boolean(field.helpText));
	const [optionsOpen, setOptionsOpen] = useState(true);

	const showHelp = helpOpen || Boolean(errors.helpText);
	const showOptions =
		isSelect && (optionsOpen || Boolean(errors.options) || hasOptionError());
	const hasError = Boolean(
		errors.top ||
			errors.label ||
			errors.type ||
			errors.required ||
			errors.sensitive ||
			errors.helpText ||
			errors.options ||
			hasOptionError(),
	);
	// an options error on a type without options has no editor to sit under
	const topError = errors.top ?? (isSelect ? undefined : errors.options);

	function hasOptionError() {
		return (field.options ?? []).some((_, j) => Boolean(errors.option(j)));
	}

	const ids = {
		required: `${baseId}-required`,
		sensitive: `${baseId}-sensitive`,
		sensitiveHelp: `${baseId}-sensitive-help`,
		sensitiveLock: `${baseId}-sensitive-lock`,
		optionsError: `${baseId}-options-error`,
		warning: `${baseId}-warning`,
	};
	const sensitiveOn = lock !== null || field.sensitive === true;
	const lockCopy =
		lock === "type"
			? t("sensitiveLockedType")
			: lock === "label"
				? t("sensitiveLockedLabel")
				: null;
	const describedBy = [ids.sensitiveHelp, lockCopy ? ids.sensitiveLock : null]
		.filter(Boolean)
		.join(" ");

	function pickType(next: FieldType) {
		const row = changeType(field, next, published);
		onChange(row);
		if (row.type === "select") setOptionsOpen(true);
	}

	function onHandleKey(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key === "ArrowUp" && index > 0) {
			event.preventDefault();
			onMove(index - 1);
		} else if (event.key === "ArrowDown" && index < count - 1) {
			event.preventDefault();
			onMove(index + 1);
		}
	}

	return (
		<li
			data-dragging={dragging || undefined}
			aria-invalid={hasError || undefined}
			className={`flex flex-col gap-2 rounded-md border bg-surface px-3 py-2 font-body-sm text-text-primary ${
				hasError ? "border-border-danger" : "border-border-input"
			} ${dragging ? "opacity-60 ring-2 ring-border-selected" : ""}`}
		>
			{topError && (
				<p role="alert" className="font-medium text-text-status-danger">
					{topError}
				</p>
			)}
			<div className="flex flex-wrap items-start gap-3">
				<button
					type="button"
					aria-label={t("dragHandle")}
					onKeyDown={onHandleKey}
					className="mt-7 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused active:cursor-grabbing"
					{...dragHandleProps}
				>
					<GripVerticalIcon aria-hidden="true" className="size-5" />
				</button>

				<Input
					data-field-label=""
					label={t("label")}
					autoComplete="off"
					className="min-w-48 flex-1"
					value={field.label}
					status={errors.label ? "error" : "default"}
					help={errors.label}
					onChange={(event) =>
						onChange({
							...field,
							label: event.target.value,
							...(sensitiveLockOf({ ...field, label: event.target.value }) &&
							field.sensitive !== true
								? { sensitive: true }
								: {}),
						})
					}
				/>

				<div className="flex w-44 flex-col">
					<span aria-hidden="true" className="pb-1">
						{t("type")}
					</span>
					<FieldTypeSelect
						value={field.type}
						system={system}
						invalid={Boolean(errors.type)}
						describedBy={
							[
								errors.type ? `${baseId}-type-error` : null,
								field.replaces ? ids.warning : null,
							]
								.filter(Boolean)
								.join(" ") || undefined
						}
						onChange={pickType}
					/>
					{errors.type && (
						<p
							id={`${baseId}-type-error`}
							role="alert"
							className="font-medium text-text-status-danger"
						>
							{errors.type}
						</p>
					)}
				</div>

				<div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
					<div className="flex items-center gap-2">
						<Switch
							aria-labelledby={ids.required}
							checked={field.required === true}
							disabled={requiredFixed}
							onCheckedChange={(checked) =>
								onChange({ ...field, required: checked })
							}
						/>
						<span id={ids.required}>{t("required")}</span>
					</div>
					{!system && (
						<div className="flex items-center gap-2">
							{lockCopy ? (
								<Tooltip content={lockCopy}>
									<span className="inline-flex">
										<SensitiveSwitch
											labelId={ids.sensitive}
											describedBy={describedBy}
											checked={sensitiveOn}
											disabled
											onChange={() => undefined}
										/>
									</span>
								</Tooltip>
							) : (
								<SensitiveSwitch
									labelId={ids.sensitive}
									describedBy={describedBy}
									checked={sensitiveOn}
									onChange={(checked) =>
										onChange({ ...field, sensitive: checked })
									}
								/>
							)}
							<span id={ids.sensitive}>{t("sensitive")}</span>
							<span id={ids.sensitiveHelp} className="sr-only">
								{t("sensitiveHelp")}
							</span>
							{lockCopy && (
								<span id={ids.sensitiveLock} className="sr-only">
									{lockCopy}
								</span>
							)}
						</div>
					)}
					{system && (
						<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
							{t("systemBadge")}
						</span>
					)}
				</div>

				<div className="mt-7 ml-auto">
					<FieldRowMenu
						isSelect={isSelect}
						removable={!system}
						canMoveUp={index > 0}
						canMoveDown={index < count - 1}
						onHelpText={() => setHelpOpen((open) => !open)}
						onOptions={() => setOptionsOpen((open) => !open)}
						onMoveUp={() => onMove(index - 1)}
						onMoveDown={() => onMove(index + 1)}
						onRemove={onRemove}
					/>
				</div>
			</div>

			{errors.sensitive && (
				<p role="alert" className="font-medium text-text-status-danger">
					{errors.sensitive}
				</p>
			)}
			{errors.required && (
				<p role="alert" className="font-medium text-text-status-danger">
					{errors.required}
				</p>
			)}

			{field.replaces && (
				<p
					id={ids.warning}
					className="rounded-md bg-background-status-warning-subtler px-2 py-1 font-medium text-text-status-warning-bolder"
				>
					{t("typeChangeWarning")}
				</p>
			)}

			{showHelp && (
				<Input
					label={t("helpText")}
					autoComplete="off"
					value={field.helpText ?? ""}
					status={errors.helpText ? "error" : "default"}
					help={errors.helpText}
					onChange={(event) =>
						onChange({
							...field,
							helpText: event.target.value === "" ? null : event.target.value,
						})
					}
				/>
			)}

			{showOptions && (
				<FieldOptionsEditor
					options={field.options ?? []}
					groupError={errors.options}
					groupErrorId={ids.optionsError}
					errorOf={errors.option}
					onChange={(options) => onChange({ ...field, options })}
				/>
			)}
		</li>
	);
}

function SensitiveSwitch({
	labelId,
	describedBy,
	checked,
	disabled,
	onChange,
}: Readonly<{
	labelId: string;
	describedBy: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}>) {
	return (
		<Switch
			aria-labelledby={labelId}
			aria-describedby={describedBy}
			checked={checked}
			disabled={disabled}
			onCheckedChange={onChange}
		/>
	);
}
