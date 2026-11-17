"use client";

import { EllipsisIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type Ref, useCallback } from "react";
import { FieldAnswerPreview } from "../field-answer-preview";
import type { DraftField } from "../field-model";
import { FieldOptionsEditor } from "../field-options-editor";
import { useSortableCard } from "../field-reorder";
import {
	isPanelSlot,
	placedErrors,
	type RowErrors,
	slotHasControl,
} from "./field-card-errors";
import { FieldTextInputs } from "./field-text-inputs";

// Preserve the original public exports for existing consumers.
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
	panelOpen: boolean;
	panelId: string;
	// wide screens edit on the card; narrow ones edit in the sheet
	wide: boolean;
	// the row key, which FieldReorder sorts by
	dragId: string;
	// keep it stable: the card merges it with the drag's node ref
	cardRef: (element: HTMLLIElement | null) => void;
	settingsRef: Ref<HTMLButtonElement>;
	onSelect: () => void;
	// a click or tap on the card itself, not on one of its controls
	onActivate: () => void;
	onToggleSettings: () => void;
	onChange: (next: DraftField) => void;
};

// The list item holds the card; a sibling activation button covers its surface.
// Inputs and settings remain separate controls above that button.
export function FieldCard({
	field,
	errors,
	baseId,
	selected,
	panelOpen,
	panelId,
	wide,
	dragId,
	cardRef,
	settingsRef,
	onSelect,
	onActivate,
	onToggleSettings,
	onChange,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const system = Boolean(field.systemKey);
	const isSelect = field.type === "select";
	const editing = selected && wide;
	const typeName = t(`types.${field.type}`);
	const title = field.label || typeName;
	const helpText = field.helpText ?? "";
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
	const underTitle = placed.find(({ slot }) => {
		const control = slotHasControl(slot, field);
		if (editing) {
			if (!control) return true;
			return isPanelSlot(slot) && !panelOpen;
		}
		if (selected && !wide) return control;
		return true;
	})?.message;

	const outline = selected
		? "outline-border-brand-selected"
		: "outline-transparent hover:outline-border-brand-disabled";

	function onSettingsKey(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key !== "Enter" || event.repeat) return;
		event.preventDefault();
		onToggleSettings();
	}

	return (
		<li
			{...drag.listeners}
			ref={nodeRef}
			style={drag.style}
			tabIndex={-1}
			aria-label={title}
			aria-current={selected ? "true" : undefined}
			aria-invalid={placed.length > 0 || undefined}
			data-dragging={drag.dragging || undefined}
			onFocus={onSelect}
			className={`group relative isolate flex touch-pan-y flex-col gap-2 rounded-md outline-2 -outline-offset-2 transition-[outline-color] duration-200 ease-out bg-surface-sunken px-3 py-2 font-body-sm text-text-primary ${outline} ${
				drag.dragging ? "z-20 shadow-overlay select-none" : ""
			} ${selected ? "" : "cursor-pointer"}`}
		>
			<button
				type="button"
				data-card-activate=""
				tabIndex={selected ? -1 : 0}
				aria-label={title}
				// an idle card, the only time this button is a tab stop, always shows
				// its first error under the title
				aria-describedby={underTitle ? `${baseId}-card-error` : undefined}
				// A press may become a drag (§4.4), which must not select the card, so
				// the press does not take focus. The click does, and dnd-kit drops the
				// click that follows a drag.
				onMouseDown={(event) => event.preventDefault()}
				onClick={(event) => {
					event.currentTarget.focus();
					onActivate();
				}}
				className="absolute inset-0 z-0 cursor-pointer rounded-md focus-visible:outline-none"
			/>
			<div className="pointer-events-none relative z-10 flex flex-col gap-2 [&_:is(input,textarea,select,button,a,label,[role=switch],[role=combobox],[role=option],[role=menuitem])]:pointer-events-auto">
				<div className="flex items-start gap-2">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						{editing ? (
							<FieldTextInputs
								field={field}
								errors={errors}
								baseId={baseId}
								onChange={onChange}
							/>
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
							<p
								id={`${baseId}-card-error`}
								className="font-medium text-text-status-danger"
							>
								{underTitle}
							</p>
						)}
					</div>
					{system && (
						<span className="mt-1 uppercase tracking-widest rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
							{t("systemBadge")}
						</span>
					)}
					<button
						ref={selected ? settingsRef : undefined}
						type="button"
						tabIndex={selected ? 0 : -1}
						aria-label={t("menu")}
						aria-expanded={panelOpen}
						aria-controls={panelOpen ? panelId : undefined}
						onClick={onToggleSettings}
						onKeyDown={onSettingsKey}
						className={`transition-all duration-150 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused aria-expanded:bg-surface-pressed ${
							selected ? "" : "opacity-0 group-hover:opacity-100"
						}`}
					>
						<EllipsisIcon aria-hidden="true" className="size-5" />
					</button>
				</div>

				{field.replaces && (
					<TypeChangeWarning id={wide ? `${baseId}-warning` : undefined} />
				)}

				{editing && isSelect ? (
					<FieldOptionsEditor
						options={field.options ?? []}
						groupError={errors.options}
						groupErrorId={`${baseId}-options-error`}
						errorOf={errors.option}
						onChange={(options) => onChange({ ...field, options })}
					/>
				) : (
					<FieldAnswerPreview field={field} />
				)}
			</div>
		</li>
	);
}
