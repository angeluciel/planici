"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { FieldAnswerPreview } from "../field-answer-preview";
import type { DraftField } from "../field-model";
import { useSortableCard } from "../field-reorder";
import {
	placedErrors,
	type RowErrors,
	slotHasControl,
} from "./field-card-errors";
import { FieldInlineInput } from "./field-inline-input";
import { withLabel } from "./field-updates";

export {
	isPanelSlot,
	placedErrors,
	type RowErrors,
	slotHasControl,
} from "./field-card-errors";
export { CARD_CONTROLS, isCardControl } from "./field-card-interactions";
export { CardTextInput, FieldTextInputs } from "./field-text-inputs";
export { withLabel } from "./field-updates";

export function TypeChangeWarning({ id }: Readonly<{ id?: string }>) {
	const t = useTranslations("forms.fields");
	return (
		<p
			id={id}
			className="rounded-md bg-background-status-warning-subtler px-2 py-1 font-body-sm font-medium text-text-status-warning-bolder"
		>
			{t("typeChangeWarning")}
		</p>
	);
}

type Props = {
	field: DraftField;
	errors: RowErrors;
	baseId: string;
	selected: boolean;
	panelId: string;
	dragId: string;
	wide: boolean;
	saving: boolean;
	cardRef: (element: HTMLLIElement | null) => void;
	onActivate: () => void;
	onChange: (next: DraftField) => void;
};

export function FieldCard({
	field,
	errors,
	baseId,
	selected,
	panelId,
	dragId,
	wide,
	saving,
	cardRef,
	onActivate,
	onChange,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const system = Boolean(field.systemKey);
	const typeName = t(`types.${field.type}`);
	const title = field.label || typeName;
	const helpText = field.helpText ?? "";
	const helpOn = field.helpText !== null && field.helpText !== undefined;
	const inline = wide && !selected;
	const errorId = `${baseId}-card-error`;
	const drag = useSortableCard(dragId);
	const { setNodeRef } = drag;
	const nodeRef = useCallback(
		(element: HTMLLIElement | null) => {
			setNodeRef(element);
			cardRef(element);
		},
		[setNodeRef, cardRef],
	);

	const placed = placedErrors(field, errors);
	const underTitle = placed.find(
		({ slot }) => !selected || !slotHasControl(slot, field),
	)?.message;

	const outline = selected
		? "outline-border-brand-selected"
		: "outline-transparent hover:outline-border-brand-disabled";

	return (
		<li
			{...drag.listeners}
			ref={nodeRef}
			style={drag.style}
			aria-label={title}
			aria-current={selected ? "true" : undefined}
			aria-invalid={placed.length > 0 || undefined}
			data-dragging={drag.dragging || undefined}
			className={`relative isolate flex touch-pan-y flex-col gap-2 rounded-md outline-2 -outline-offset-2 transition-[outline-color] duration-200 ease-out bg-surface-sunken px-3 py-2 font-body-sm text-text-primary ${outline} ${
				drag.dragging ? "z-20 shadow-overlay select-none" : ""
			}`}
		>
			<button
				type="button"
				data-card-activate=""
				tabIndex={0}
				aria-label={title}
				aria-haspopup="dialog"
				aria-expanded={selected}
				aria-controls={selected ? panelId : undefined}
				aria-describedby={underTitle ? errorId : undefined}
				onMouseDown={(event) => event.preventDefault()}
				onClick={(event) => {
					event.currentTarget.focus();
					onActivate();
				}}
				className="absolute inset-0 z-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-border-focused"
			/>
			<div className="pointer-events-none relative z-10 flex flex-col gap-2">
				<div className="flex items-start gap-2">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						{inline ? (
							<>
								<FieldInlineInput
									errorSlot="label"
									value={field.label}
									name={t("inlineLabel", { name: title })}
									placeholder={typeName}
									invalid={Boolean(errors.label)}
									describedBy={errors.label ? errorId : undefined}
									readOnly={saving}
									className="font-body-md font-semibold text-text-bold placeholder:text-text-secondary"
									onChange={(label) => onChange(withLabel(field, label))}
								/>
								{helpOn && (
									<FieldInlineInput
										errorSlot="helpText"
										value={helpText}
										name={t("inlineHelpText", { name: title })}
										placeholder={t("descriptionPlaceholder")}
										invalid={Boolean(errors.helpText)}
										describedBy={errors.helpText ? errorId : undefined}
										readOnly={saving}
										className="text-text-secondary placeholder:text-text-disabled"
										onChange={(next) => onChange({ ...field, helpText: next })}
									/>
								)}
							</>
						) : (
							<>
								<p
									className={`wrap-break-word font-body-md font-semibold ${
										field.label ? "text-text-bold" : "text-text-secondary"
									}`}
								>
									{title}
								</p>
								{helpText && <p className="text-text-secondary">{helpText}</p>}
							</>
						)}
						{underTitle && (
							<p id={errorId} className="font-medium text-text-status-danger">
								{underTitle}
							</p>
						)}
					</div>
					{system && (
						<span className="mt-1 uppercase tracking-widest rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
							{t("systemBadge")}
						</span>
					)}
				</div>

				{/* displays only; the panel's copy is the one "Tipo" refers to */}
				{field.replaces && <TypeChangeWarning />}

				<FieldAnswerPreview field={field} />
			</div>
		</li>
	);
}
