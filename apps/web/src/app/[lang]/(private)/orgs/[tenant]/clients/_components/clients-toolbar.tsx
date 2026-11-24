"use client";

import type { ClientStatusFilter } from "@planici/schemas";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const STATUSES = ["active", "inactive", "all"] as const;

// Search and status, on every screen (SPEC-0004 §4.1, SPEC-0006 §4.6).
export function ClientsToolbar({
	input,
	onInput,
	shortInput,
	status,
	onStatus,
}: Readonly<{
	input: string;
	onInput: (value: string) => void;
	shortInput: boolean;
	status: ClientStatusFilter;
	onStatus: (value: ClientStatusFilter) => void;
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
		</div>
	);
}
