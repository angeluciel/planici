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
	isPanelSlot,
	type RowErrors,
	slotHasControl,
} from "./field-card/field-card";
import type { FieldErrorSlot } from "./field-error-target";
import { type DraftField, MAX_FIELDS, newField } from "./field-model";
import { FieldReorder } from "./field-reorder";
import { FieldSettings } from "./field-settings";
import { RemoveFieldDialog } from "./remove-field-dialog";

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

// what the panel focuses when it opens: its first control, nothing (a new
// field keeps focus on its label), or the control of an error
type PanelFocus = "first" | "none" | { slot: FieldErrorSlot };

// focus to move once the card's new state is on screen
type PendingFocus =
	| { kind: "card"; key: string }
	| { kind: "control"; key: string; slot: FieldErrorSlot | "label" }
	| { kind: "afterRemove"; index: number };

function slotSelector(slot: FieldErrorSlot | "label"): string {
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
	const settingsRef = useRef<HTMLButtonElement>(null);
	const cardEls = useRef(new Map<string, HTMLLIElement>());
	// one stable ref callback per card, so the drag's node ref is not reset on
	// every render
	const cardRefs = useRef(
		new Map<string, (element: HTMLLIElement | null) => void>(),
	);
	const panelFocus = useRef<PanelFocus>("first");
	// focus goes back to "⋯" only when the professional closed the panel
	const closedByUser = useRef(false);
	const pendingFocus = useRef<PendingFocus | null>(null);

	const [selected, setSelected] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const [addedNew, setAddedNew] = useState(false);
	const [removing, setRemoving] = useState<number | null>(null);

	const count = values.length;
	const atLimit = count >= MAX_FIELDS;
	const onlySystem = count > 0 && values.every((row) => row.systemKey);
	const selectedIndex = rows.findIndex((row) => row.rowKey === selected);
	const selectedField = selectedIndex >= 0 ? values[selectedIndex] : undefined;
	const showPanel = panelOpen && selectedField !== undefined;

	// selecting another card closes the panel (Q14)
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

	function select(key: string) {
		if (key === selected) return;
		closedByUser.current = false;
		setSelected(key);
		setPanelOpen(false);
	}

	function openPanel(focus: PanelFocus) {
		panelFocus.current = focus;
		setPanelOpen(true);
	}

	function closePanel() {
		closedByUser.current = true;
		setPanelOpen(false);
	}

	// a click or tap on a card: on narrow screens it also opens the sheet
	function activate(key: string) {
		select(key);
		if (!wide) openPanel("first");
	}

	function toggleSettings(key: string) {
		if (key !== selected) {
			select(key);
			openPanel("first");
			return;
		}
		if (panelOpen) closePanel();
		else openPanel("first");
	}

	// a new card is selected with its panel open (§4.6, Novo campo)
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when a row is appended
	useEffect(() => {
		if (!addedNew) return;
		setAddedNew(false);
		const key = rows.at(-1)?.rowKey;
		if (!key) return;
		closedByUser.current = false;
		setSelected(key);
		if (wide) {
			openPanel("none");
			pendingFocus.current = { kind: "control", key, slot: "label" };
		} else {
			openPanel("first");
		}
	}, [addedNew, rows.length]);

	// the first error of a save (§4.6 steps 8 and 9). A layout effect, so the
	// card is selected before the error is painted on the idle card.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once per save
	useLayoutEffect(() => {
		if (!reveal) return;
		const key = rows[reveal.index]?.rowKey;
		const field = values[reveal.index];
		if (!key || !field) return;
		const { slot } = reveal;
		select(key);

		if (!slotHasControl(slot, field)) {
			if (!wide) {
				toast.show(text(reveal.message) ?? reveal.message, "danger");
			}
			setPanelOpen(false);
			pendingFocus.current = { kind: "card", key };
			return;
		}
		if (!wide || isPanelSlot(slot)) openPanel({ slot });
		pendingFocus.current = { kind: "control", key, slot };
	}, [reveal]);

	// moves focus once the selection, the card and the panel are rendered
	useEffect(() => {
		const pending = pendingFocus.current;
		if (!pending) return;
		if (pending.kind === "afterRemove") {
			pendingFocus.current = null;
			const cards = listRef.current?.children;
			const next = (cards?.[pending.index] ?? cards?.[pending.index - 1]) as
				| HTMLElement
				| undefined;
			if (next) next.focus();
			else addRef.current?.querySelector("button")?.focus();
			return;
		}
		if (pending.key !== selected) return;
		pendingFocus.current = null;
		const card = cardEls.current.get(pending.key);
		if (pending.kind === "card") {
			card?.focus();
			return;
		}
		const selector = slotSelector(pending.slot);
		const target =
			card?.querySelector<HTMLElement>(selector) ??
			panelRef.current?.querySelector<HTMLElement>(selector);
		target?.focus();
	});

	function focusInPanel(): HTMLElement | boolean {
		const request = panelFocus.current;
		if (request === "none") return false;
		const root = panelRef.current;
		if (!root) return true;
		let selector: string;
		if (request !== "first") selector = slotSelector(request.slot);
		else if (wide) selector = '[data-error-slot="required"]';
		else selector = '[data-error-slot="label"]';
		return root.querySelector<HTMLElement>(selector) ?? true;
	}

	function focusOnClose(): HTMLElement | false {
		if (!closedByUser.current) return false;
		closedByUser.current = false;
		return settingsRef.current ?? false;
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

	// focus goes to the next card, else the previous one, else [Novo campo]
	function removeRow(index: number) {
		remove(index);
		setRemoving(null);
		setSelected(null);
		pendingFocus.current = { kind: "afterRemove", index };
	}

	function requestRemove(index: number) {
		const row = values[index];
		if (!row) return;
		closedByUser.current = false;
		setPanelOpen(false);
		if (answersOf(row) > 0) setRemoving(index);
		else removeRow(index);
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
	const removingRow = removing === null ? undefined : values[removing];
	const rowId = (key: string) => `${listId}-${key}`;

	const settings = selectedField && selected && (
		<div ref={panelRef}>
			<FieldSettings
				key={selected}
				field={selectedField}
				published={publishedOf(selectedField)}
				errors={errorsOf(selectedIndex)}
				baseId={rowId(selected)}
				index={selectedIndex}
				count={count}
				narrow={!wide}
				onChange={(next) => setRow(selectedIndex, next)}
				onMove={(to) => moveTo(selectedIndex, to)}
				onRemove={() => requestRemove(selectedIndex)}
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
				disabled={disabled}
				onTap={activate}
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
								selected={key === selected}
								panelOpen={key === selected && showPanel}
								panelId={panelId}
								wide={wide}
								dragId={key}
								cardRef={cardRefOf(key)}
								settingsRef={settingsRef}
								onSelect={() => select(key)}
								onActivate={() => activate(key)}
								onToggleSettings={() => toggleSettings(key)}
								onChange={(next) => setRow(index, next)}
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
					anchor={() =>
						(selected ? cardEls.current.get(selected) : null) ?? null
					}
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

			{removingRow && removing !== null && (
				<RemoveFieldDialog
					count={answersOf(removingRow)}
					onCancel={() => setRemoving(null)}
					onConfirm={() => removeRow(removing)}
				/>
			)}
		</div>
	);
}
