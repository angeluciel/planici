"use client";

import {
	CLIENT_SORTS,
	type ClientSort,
	type ClientStatusFilter,
} from "@planici/schemas";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Select } from "@/components/ui/select";
import { useClientTemplates } from "./use-client-templates";

const STATUSES = ["active", "inactive", "all"] as const;
const ALL_FORMS = "all";

const SORT_KEYS: Record<ClientSort, "nameAsc" | "nameDesc" | "updatedAt"> = {
	name: "nameAsc",
	"-name": "nameDesc",
	"-updatedAt": "updatedAt",
};

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
		<div className="flex flex-col gap-3 md:flex-row md:items-start">
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
						className="flex-1 outline-none"
					/>
				</label>
				{shortInput && (
					<span className="px-2 font-body-sm text-text-secondary">
						{t("list.searchHint")}
					</span>
				)}
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
					<Select
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
					<Select
						label={t("list.sort.label")}
						value={sort ?? "name"}
						options={sortOptions}
						onValueChange={(value) => onSort(value as ClientSort)}
					/>
				</div>
			)}
		</div>
	);
}
