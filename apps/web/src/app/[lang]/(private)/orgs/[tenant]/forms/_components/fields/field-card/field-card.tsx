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
	// the card's panel is open (SPEC-0002 §4.6 step 3)
	selected: boolean;
	panelId: string;
	dragId: string;
	cardRef: (element: HTMLLIElement | null) => void;
	onActivate: () => void;
};

// One field of the list. It only displays: the label, description and every
// setting are edited in the panel (SPEC-0002 §4.6 step 2). A button covers the
// card: it is the card's tab stop, and a click, Enter or Space on it opens the
// panel. Focus alone selects nothing (§4.6 step 1).
export function FieldCard({
	field,
	errors,
	baseId,
	selected,
	panelId,
	dragId,
	cardRef,
	onActivate,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const system = Boolean(field.systemKey);
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

	// while the panel is open it shows the messages under their controls; one
	// with no control stays here (§4.6 steps 8 and 9)
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
				aria-describedby={underTitle ? `${baseId}-card-error` : undefined}
				// a drag starts with this press; the button gets focus on the click
				// only, so a drag neither focuses nor selects the card (§4.4 step 3)
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
						<p
							className={`wrap-break-word font-body-md font-semibold ${
								field.label ? "text-text-bold" : "text-text-secondary"
							}`}
						>
							{title}
						</p>
						{helpText && <p className="text-text-secondary">{helpText}</p>}
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
				</div>

				{/* displays only; the panel's copy is the one "Tipo" refers to */}
				{field.replaces && <TypeChangeWarning />}

				<FieldAnswerPreview field={field} />
			</div>
		</li>
	);
}
