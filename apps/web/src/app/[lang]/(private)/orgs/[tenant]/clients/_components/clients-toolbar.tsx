"use client";

import {
	CLIENT_SORTS,
	type ClientSort,
	type ClientStatusFilter,
} from "@planici/schemas";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { useClientTemplates } from "./use-client-templates";

const STATUSES = ["active", "inactive", "all"] as const;
const ALL_FORMS = "all";

const SORT_KEYS: Record<ClientSort, "nameAsc" | "nameDesc" | "updatedAt"> = {
	name: "nameAsc",
	"-name": "nameDesc",
	"-updatedAt": "updatedAt",
};

type PickerOption<T extends string> = { value: T; label: string };

// Single choice shown as a menu button: the trigger shows the current choice,
// and its accessible name is "<label>: <choice>". Same trigger look as the
// `field` Select.
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

// Search and status on every screen; the Modelo and "Ordenar por" controls on
// wide screens only (SPEC-0006 §4.1, §4.6).
export function ClientsToolbar({
	input,
	onInput,
	shortInput,
	status,
	onStatus,
	wide,
	formId,
	onFormId,
	sort,
	onSort,
}: Readonly<{
	input: string;
	onInput: (value: string) => void;
	shortInput: boolean;
	status: ClientStatusFilter;
	onStatus: (value: ClientStatusFilter) => void;
	wide: boolean;
	formId: string | null;
	onFormId: (value: string | null) => void;
	sort: ClientSort | null;
	onSort: (value: ClientSort) => void;
}>) {
	const [showSearchHint, setShowSearchHint] = useState(false);

	useEffect(() => {
		if (!shortInput) {
			setShowSearchHint(false);
			return;
		}

		const timeoutId = setTimeout(() => setShowSearchHint(true), 300);
		return () => clearTimeout(timeoutId);
	}, [shortInput]);

	const t = useTranslations("clients");
	const statusName = useId();
	const templates = useClientTemplates().data;

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
		<div className="flex flex-col justify-center gap-3 md:flex-row md:items-start">
			<div className="flex flex-1 flex-col gap-1">
				<label className="group flex items-center gap-2 rounded-md bg-surface-sunken px-2 py-2">
					<SearchIcon
						aria-hidden="true"
						size={16}
						className="text-icon-disabled transition-colors duration-100 group-focus-within:text-icon"
					/>
					<input
						type="search"
						value={input}
						aria-label={t("list.search")}
						placeholder={t("list.search")}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						data-bwignore="true"
						spellCheck={false}
						onChange={(event) => onInput(event.target.value)}
						className="flex-1 outline-none font-body-sm"
					/>
				</label>
				<span
					className={cn(
						"px-2 font-body-caption text-text-secondary",
						shortInput && showSearchHint ? "visible" : "invisible",
					)}
				>
					{t("list.searchHint")}
				</span>
			</div>

			<fieldset className="flex w-fit shrink-0 gap-1 rounded-md bg-surface-sunken p-1">
				<legend className="sr-only">{t("list.filter.status")}</legend>
				{STATUSES.map((value) => (
					<label
						key={value}
						className="flex min-h-8 cursor-pointer items-center rounded-sm px-3 font-body-sm text-text-secondary transition-colors duration-100 hover:text-text-primary has-checked:bg-background-selected-bold has-checked:text-text-inverse has-focus-visible:outline-2 has-focus-visible:outline-border-focused"
					>
						<input
							type="radio"
							name={statusName}
							value={value}
							checked={status === value}
							onChange={() => onStatus(value)}
							className="sr-only"
						/>
						{t(`list.status.${value}`)}
					</label>
				))}
			</fieldset>

			{wide && templates && templates.length >= 2 && (
				<div className="w-full shrink-0 md:w-52">
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
			{wide && (
				<div className="w-full shrink-0 md:w-52">
					<Picker
						label={t("list.sort.label")}
						value={sort ?? "name"}
						options={sortOptions}
						onValueChange={onSort}
					/>
				</div>
			)}
		</div>
	);
}
