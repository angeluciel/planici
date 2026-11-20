"use client";

import { CLIENT_SORTS, type ClientSort } from "@planici/schemas";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useClientTemplates } from "./use-client-templates";

const ALL_FORMS = "all";

const SORT_KEYS: Record<ClientSort, "nameAsc" | "nameDesc" | "updatedAt"> = {
	name: "nameAsc",
	"-name": "nameDesc",
	"-updatedAt": "updatedAt",
};

type PickerOption<T extends string> = { value: T; label: string };

function Picker<T extends string>({
	label,
	value,
	options,
	onValueChange,
}: Readonly<{
	label: string;
	value: T;
	options: readonly PickerOption<T>[];
	onValueChange: (value: T) => void;
}>) {
	const current = options.find((option) => option.value === value);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex h-10 w-full min-w-36 cursor-pointer items-center justify-between gap-2 rounded-md border-2 border-border-input bg-transparent px-2 font-body-sm text-text-bold focus-visible:border-border-focused focus-visible:outline-none data-popup-open:border-border-focused">
				<span className="min-w-0 truncate text-left">
					<span className="sr-only">{label}: </span>
					{current?.label}
				</span>
				<ChevronDownIcon
					aria-hidden="true"
					className="size-4 shrink-0 text-icon-subtle"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-auto min-w-(--anchor-width)">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(next) => {
						const chosen = options.find((option) => option.value === next);
						if (chosen) onValueChange(chosen.value);
					}}
				>
					{options.map((option) => (
						<DropdownMenuRadioItem
							key={option.value}
							value={option.value}
							closeOnClick
						>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// The Modelo and "Ordenar por" controls, above the list on its right, on wide
// screens only and in every list state (SPEC-0006 §4.2 step 1, §4.4 step 1).
// The templates are read on every screen, as the [Novo] menu reads them too.
export function ClientsPickers({
	wide,
	formId,
	onFormId,
	sort,
	onSort,
}: Readonly<{
	wide: boolean;
	formId: string | null;
	onFormId: (value: string | null) => void;
	sort: ClientSort | null;
	onSort: (value: ClientSort) => void;
}>) {
	const t = useTranslations("clients");
	const templates = useClientTemplates().data;

	if (!wide) return null;

	const formOptions = [
		{ value: ALL_FORMS, label: t("list.filter.allForms") },
		...(templates ?? []).map((form) => ({
			value: form.id,
			label:
				form.status === "archived"
					? t("list.filter.archivedForm", { name: form.name })
					: form.name,
		})),
	];
	const sortOptions = CLIENT_SORTS.map((value) => ({
		value,
		label: t(`list.sort.${SORT_KEYS[value]}`),
	}));

	return (
		<div className="flex flex-wrap justify-end gap-3">
			{templates && templates.length >= 2 && (
				<div className="w-52">
					<Picker
						label={t("list.filter.form")}
						value={formId ?? ALL_FORMS}
						options={formOptions}
						onValueChange={(value) =>
							onFormId(value === ALL_FORMS ? null : value)
						}
					/>
				</div>
			)}
			<div className="w-52">
				<Picker
					label={t("list.sort.label")}
					value={sort ?? "name"}
					options={sortOptions}
					onValueChange={onSort}
				/>
			</div>
		</div>
	);
}
