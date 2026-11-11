"use client";

import type { Field } from "@planici/schemas";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
	type FieldErrors,
	get,
	type UseFormReturn,
	useFieldArray,
	useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FormDraft } from "../../_lib/draft";
import { type DraftField, MAX_FIELDS, newField } from "./field-model";
import { FieldRow, type RowErrors } from "./field-row";
import { RemoveFieldDialog } from "./remove-field-dialog";
import { useFieldReorder } from "./use-field-reorder";

type Props = {
	form: UseFormReturn<FormDraft>;
	// the saved template's fields, to tell published fields from new ones
	original: readonly Field[];
	// translates a validation key; undefined when there is no copy for it
	text: (key: string | undefined) => string | undefined;
	// what `errors.fields` holds, so the list re-renders when it changes
	errors: FieldErrors<FormDraft>["fields"];
};

export function FieldList({ form, original, text, errors }: Readonly<Props>) {
	const t = useTranslations("forms.fields");
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
	const [focusNew, setFocusNew] = useState(false);
	const [removing, setRemoving] = useState<number | null>(null);
	const { dragging, handleProps } = useFieldReorder({ listRef, move });

	const count = values.length;
	const atLimit = count >= MAX_FIELDS;
	const onlySystem = count > 0 && values.every((row) => row.systemKey);

	// a new row takes focus on its label (§4.1 step 2)
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when a row is appended
	useEffect(() => {
		if (!focusNew) return;
		setFocusNew(false);
		const inputs = listRef.current?.querySelectorAll<HTMLInputElement>(
			"input[data-field-label]",
		);
		inputs?.[inputs.length - 1]?.focus();
	}, [focusNew, rows.length]);

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

	function removeRow(index: number) {
		remove(index);
		setRemoving(null);
	}

	function requestRemove(index: number) {
		const row = values[index];
		if (!row) return;
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
			<ul ref={listRef} className="flex flex-col gap-2">
				{rows.map((row, index) => {
					const field = values[index];
					if (!field) return null;
					return (
						<FieldRow
							key={row.rowKey}
							field={field}
							index={index}
							count={count}
							published={publishedOf(field)}
							errors={errorsOf(index)}
							dragging={dragging === index}
							dragHandleProps={handleProps(index)}
							onChange={(next) => setRow(index, next)}
							onMove={(to) => moveTo(index, to)}
							onRemove={() => requestRemove(index)}
						/>
					);
				})}
			</ul>
			{onlySystem && (
				<p className="font-body-sm text-text-secondary">{t("onlySystem")}</p>
			)}
			<div className="flex flex-wrap items-center gap-3">
				<Button
					variant="subtle"
					text={t("add")}
					leadingIcon={PlusIcon}
					className="w-auto"
					disabled={atLimit}
					onPress={() => {
						append(newField(), { shouldFocus: false });
						setFocusNew(true);
					}}
				/>
				{atLimit && (
					<p className="font-body-sm text-text-secondary">
						{t("limitReached")}
					</p>
				)}
			</div>
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
