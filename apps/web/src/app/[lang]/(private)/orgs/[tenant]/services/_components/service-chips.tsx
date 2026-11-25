"use client";

import type { ServiceTemplateSummary } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const ALL_CHIP = "all";
export const ARCHIVED_CHIP = "archived";

const CHIP =
	"flex min-h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-3 font-body-sm transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-border-focused";

export type ChipsState =
	| { status: "loading" }
	| { status: "error"; retry: () => void }
	| { status: "ready"; summary: ServiceTemplateSummary };

// Whether the chip still exists in the summary (R14: "Todos" always does)
export function chipExists(chip: string, summary: ServiceTemplateSummary) {
	if (chip === ALL_CHIP) return true;
	if (chip === ARCHIVED_CHIP) return summary.archivedCount > 0;
	return summary.templates.some((template) => template.id === chip);
}

// The narrow chips (SPEC-0005 R14): "Todos", one per template that has an
// active service, "Arquivados" when a service is archived. Exactly one is
// pressed. While the summary loads, placeholders follow "Todos"; if it fails,
// "Tentar novamente" does (§9 Q25).
export function ServiceChips({
	state,
	active,
	onSelect,
}: Readonly<{
	state: ChipsState;
	active: string;
	onSelect: (chip: string) => void;
}>) {
	const t = useTranslations("services");

	const chip = (key: string, label: string) => (
		<button
			key={key}
			type="button"
			aria-pressed={active === key}
			onClick={() => onSelect(key)}
			className={cn(
				CHIP,
				active === key
					? "bg-background-selected-bold text-text-inverse"
					: "bg-surface-sunken text-text-secondary hover:text-text-primary",
			)}
		>
			{label}
		</button>
	);

	return (
		<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
			{chip(ALL_CHIP, t("list.chips.all"))}

			{state.status === "loading" && (
				<>
					<output className="sr-only">{t("list.chips.loading")}</output>
					{[0, 1, 2].map((placeholder) => (
						<Skeleton
							key={placeholder}
							className="h-8 w-20 shrink-0 rounded-full"
						/>
					))}
				</>
			)}

			{state.status === "error" && (
				<button
					type="button"
					onClick={state.retry}
					className={cn(
						CHIP,
						"border border-border-input text-text-primary hover:bg-surface-hovered",
					)}
				>
					{t("list.chips.retry")}
				</button>
			)}

			{state.status === "ready" && (
				<>
					{state.summary.templates.map((template) =>
						chip(template.id, template.name),
					)}
					{state.summary.archivedCount > 0 &&
						chip(ARCHIVED_CHIP, t("list.chips.archived"))}
				</>
			)}
		</div>
	);
}
