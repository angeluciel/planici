"use client";

import type { Field } from "@planici/schemas";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
	type FieldErrors,
	get,
	type UseFormReturn,
	useFieldArray,
	useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useWideScreen } from "@/hooks/use-media-query";
import type { FormDraft } from "../../_lib/draft";
import {
	FieldCard,
	type RowErrors,
	slotHasControl,
} from "./field-card/field-card";
import type { FieldErrorSlot } from "./field-error-target";
import { type DraftField, MAX_FIELDS, newField } from "./field-model";
import { FieldReorder } from "./field-reorder";
import { FieldSettings } from "./field-settings";

// The first field error of a save, which the list brings into view (SPEC-0002
// §4.6 steps 8 and 9). `nonce` changes on every save, so the same error is
// shown again when it comes back.
export type FieldReveal = {
	index: number;
	slot: FieldErrorSlot;
	// the validation key
	message: string;
	nonce: number;
};

type Props = {
	form: UseFormReturn<FormDraft>;
	// the saved template's fields, to tell published fields from new ones
	original: readonly Field[];
	// translates a validation key; undefined when there is no copy for it
	text: (key: string | undefined) => string | undefined;
	// what `errors.fields` holds, so the list re-renders when it changes
	errors: FieldErrors<FormDraft>["fields"];
	// while saving: cards cannot be dragged
	disabled?: boolean;
	reveal?: FieldReveal | null;
};

// the control the panel focuses when it opens: the label input, or the
// control of an error
type PanelFocus = FieldErrorSlot | "label";

// where focus goes when the panel closes: the card's cover button, or, after a
// removal, the card now at that place
type CloseFocus = { kind: "card" } | { kind: "removed"; index: number };

const COVER = "[data-card-activate]";

function slotSelector(slot: PanelFocus): string {
	if (typeof slot === "object")
		return `[data-error-slot="option-${slot.option}"]`;
	// the first option, or "Adicionar opção" when there is none
	if (slot === "options") {
		return '[data-error-slot^="option-"], [data-error-slot="add-option"]';
	}
	return `[data-error-slot="${slot}"]`;
}

export function FieldList({
	form,
	original,
	text,
	errors,
	disabled = false,
	reveal = null,
}: Readonly<Props>) {
	const t = useTranslations("forms.fields");
	const toast = useToast();
	const wide = useWideScreen();
	const listId = useId();
	const panelId = `${listId}-panel`;
	const { control } = form;
	const {
		fields: rows,
		append,
		remove,
		move,
	} = useFieldArray({
		control,
		name: "fields",
		keyName: "rowKey",
	});
	const values = (useWatch({ control, name: "fields" }) ?? []) as DraftField[];

	const listRef = useRef<HTMLUListElement>(null);
	// holds [Novo campo]; Button takes no ref
	const addRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const cardEls = useRef(new Map<string, HTMLLIElement>());
	// one stable ref callback per card, so the drag's node ref is not reset on
	// every render
	const cardRefs = useRef(
		new Map<string, (element: HTMLLIElement | null) => void>(),
	);
	const panelFocus = useRef<PanelFocus>("label");
	// the card whose panel was opened last, to return focus to it
	const lastOpen = useRef<string | null>(null);
	const closeFocus = useRef<CloseFocus>({ kind: "card" });
	// a card's cover button to focus once the list is rendered
	const pendingFocus = useRef<string | null>(null);

	// the row key of the card whose panel is open (§4.6 step 3)
	const [open, setOpen] = useState<string | null>(null);
	const [addedNew, setAddedNew] = useState(false);

	const count = values.length;
	const atLimit = count >= MAX_FIELDS;
	const onlySystem = count > 0 && values.every((row) => row.systemKey);
	const openIndex = rows.findIndex((row) => row.rowKey === open);
	const openField = openIndex >= 0 ? values[openIndex] : undefined;
	const showPanel = open !== null && openField !== undefined;

	function cardRefOf(key: string) {
		let ref = cardRefs.current.get(key);
		if (!ref) {
			ref = (element) => {
				if (element) cardEls.current.set(key, element);
				else cardEls.current.delete(key);
			};
			cardRefs.current.set(key, ref);
		}
		return ref;
	}

	const coverOf = (key: string | null) =>
		(key && cardEls.current.get(key)?.querySelector<HTMLElement>(COVER)) ||
		null;

	// Every way of opening a panel: click, tap, Enter, Space, a held touch, [Novo
	// campo] and the first error of a save. The card is brought into view first,
	// because the page cannot scroll while the panel is open (Q19).
	function openCard(key: string, focus: PanelFocus = "label") {
		cardEls.current.get(key)?.scrollIntoView?.({ block: "nearest" });
		panelFocus.current = focus;
		lastOpen.current = key;
		closeFocus.current = { kind: "card" };
		setOpen(key);
	}

	// Escape, the close button, or a click outside: closing deselects (§4.6 step 5)
	function closePanel() {
		setOpen(null);
	}

	// a new card opens its panel (§4.6, Novo campo)
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when a row is appended
	useEffect(() => {
		if (!addedNew) return;
		setAddedNew(false);
		const key = rows.at(-1)?.rowKey;
		if (key) openCard(key);
	}, [addedNew, rows.length]);

	// The first error of a save (§4.6 steps 8 and 9). One with a control opens
	// the card's panel on it. One without stays on the card, unselected, with a
	// toast on narrow screens. A layout effect, so the panel opens before the
	// message is painted under the card title.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once per save
	useLayoutEffect(() => {
		if (!reveal) return;
		const key = rows[reveal.index]?.rowKey;
		const field = values[reveal.index];
		if (!key || !field) return;
		const { slot } = reveal;
		if (slotHasControl(slot, field)) {
			openCard(key, slot);
			return;
		}
		if (!wide) toast.show(text(reveal.message) ?? reveal.message, "danger");
		setOpen(null);
		pendingFocus.current = key;
	}, [reveal]);

	useEffect(() => {
		const key = pendingFocus.current;
		if (!key) return;
		pendingFocus.current = null;
		coverOf(key)?.focus();
	});

	function focusInPanel(): HTMLElement | boolean {
		return (
			panelRef.current?.querySelector<HTMLElement>(
				slotSelector(panelFocus.current),
			) ?? true
		);
	}

	function focusOnClose(): HTMLElement | false {
		const target = closeFocus.current;
		if (target.kind === "card") return coverOf(lastOpen.current) ?? false;
		// the next card, else the previous one, else [Novo campo]
		const items = listRef.current?.children;
		const next = items?.[target.index] ?? items?.[target.index - 1];
		return (
			next?.querySelector<HTMLElement>(COVER) ??
			addRef.current?.querySelector<HTMLElement>("button") ??
			false
		);
	}

	function publishedOf(row: DraftField): Field | undefined {
		if (row.replaces) return row.replaces;
		return row.id ? original.find((field) => field.id === row.id) : undefined;
	}

	function answersOf(row: DraftField): number {
		return publishedOf(row)?.valueCount ?? 0;
	}

	function setRow(index: number, next: DraftField) {
		form.setValue(`fields.${index}`, next, {
			shouldDirty: true,
			shouldTouch: true,
		});
		form.clearErrors(`fields.${index}` as never);
	}

	function moveTo(from: number, to: number) {
		if (to < 0 || to >= count || to === from) return;
		move(from, to);
	}

	// from the panel, after the dialog when the field has answers (§4.6 step 11)
	function removeRow(index: number) {
		closeFocus.current = { kind: "removed", index };
		remove(index);
		setOpen(null);
	}

	function errorsOf(index: number): RowErrors {
		const at = (key: string) =>
			// `get` needs a keyed object: on a bare array it finds nothing
			text(
				get({ fields: errors }, `fields.${index}.${key}`)?.message as
					| string
					| undefined,
			);
		return {
			top: at("root"),
			label: at("label"),
			type: at("type"),
			required: at("required"),
			sensitive: at("sensitive"),
			helpText: at("helpText"),
			options: at("options.root"),
			option: (j) => at(`options.${j}.label`),
		};
	}

	const listError = text(get(errors, "root.message") as string | undefined);
	const rowId = (key: string) => `${listId}-${key}`;

	const settings = openField && open && (
		<div ref={panelRef}>
			<FieldSettings
				key={open}
				field={openField}
				published={publishedOf(openField)}
				errors={errorsOf(openIndex)}
				baseId={rowId(open)}
				index={openIndex}
				count={count}
				answers={answersOf(openField)}
				onChange={(next) => setRow(openIndex, next)}
				onMove={(to) => moveTo(openIndex, to)}
				onRemove={() => removeRow(openIndex)}
			/>
		</div>
	);

	return (
		<div className="flex flex-col gap-3">
			{listError && (
				<p
					role="alert"
					className="font-body-sm font-medium text-text-status-danger"
				>
					{listError}
				</p>
			)}
			<FieldReorder
				ids={rows.map((row) => row.rowKey)}
				move={move}
				// no drag while saving or while a panel is open (§4.4 step 2)
				disabled={disabled || open !== null}
				onTap={(key) => openCard(key)}
			>
				<ul ref={listRef} className="flex flex-col gap-2">
					{rows.map((row, index) => {
						const field = values[index];
						if (!field) return null;
						const key = row.rowKey;
						return (
							<FieldCard
								key={key}
								field={field}
								errors={errorsOf(index)}
								baseId={rowId(key)}
								selected={key === open && showPanel}
								panelId={panelId}
								dragId={key}
								cardRef={cardRefOf(key)}
								onActivate={() => openCard(key)}
							/>
						);
					})}
				</ul>
			</FieldReorder>
			{onlySystem && (
				<p className="font-body-sm text-text-secondary">{t("onlySystem")}</p>
			)}
			<div ref={addRef} className="flex flex-wrap items-center gap-3">
				<Button
					variant="subtle"
					text={t("add")}
					leadingIcon={PlusIcon}
					className="w-auto"
					disabled={atLimit}
					onPress={() => {
						append(newField(), { shouldFocus: false });
						setAddedNew(true);
					}}
				/>
				{atLimit && (
					<p className="font-body-sm text-text-secondary">
						{t("limitReached")}
					</p>
				)}
			</div>

			{wide ? (
				<Popover
					open={showPanel}
					onClose={closePanel}
					anchor={() => (open ? cardEls.current.get(open) : null) ?? null}
					title={t("panelTitle")}
					closeLabel={t("close")}
					id={panelId}
					initialFocus={focusInPanel}
					finalFocus={focusOnClose}
				>
					{settings}
				</Popover>
			) : (
				<Sheet
					open={showPanel}
					onClose={closePanel}
					title={t("panelTitle")}
					closeLabel={t("close")}
					id={panelId}
					initialFocus={focusInPanel}
					finalFocus={focusOnClose}
				>
					{settings}
				</Sheet>
			)}
		</div>
	);
}
