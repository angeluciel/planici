"use client";

import type { ServiceSort, ServiceStatusFilter } from "@planici/schemas";
import { SearchIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SwipeRowGroup } from "@/components/ui/swipe-row";
import { ListEnd } from "../../_components/list/list-end";
import { ListToolbar } from "../../_components/list/list-toolbar";
import { useReachEnd } from "../../_components/list/use-reach-end";
import {
	ALL_CHIP,
	ARCHIVED_CHIP,
	type ChipsState,
	chipExists,
	ServiceChips,
} from "./service-chips";
import { ServiceFab } from "./service-fab";
import { ServiceSwipeRow } from "./service-swipe-row";
import { useServiceActions } from "./use-service-actions";
import { useServiceList } from "./use-service-list";
import { useServiceSearch } from "./use-service-search";
import { useServiceTemplateSummary } from "./use-service-template-summary";

type Section = {
	formId: string;
	formName: string;
	rows: ReturnType<typeof useServiceList>["rows"];
};

// A header only where the template differs from the previous service's, so a
// page that continues a template adds none (SPEC-0005 G-11).
function sectionsOf(rows: Section["rows"]): Section[] {
	const sections: Section[] = [];
	for (const row of rows) {
		const last = sections.at(-1);
		if (last?.formId === row.formId) last.rows.push(row);
		else
			sections.push({
				formId: row.formId,
				formName: row.formName,
				rows: [row],
			});
	}
	return sections;
}

// /services on a narrow screen (SPEC-0005 R14, R15): title and search icon,
// chips, rows that swipe, and the floating "+".
export function ServicesNarrowList() {
	const t = useTranslations("services");
	const { tenant } = useParams<{ tenant: string }>();
	const search = useServiceSearch();
	const [searchOpen, setSearchOpen] = useState(false);
	const [chosen, setChosen] = useState(ALL_CHIP);
	const searchRef = useRef<HTMLDivElement>(null);

	const summary = useServiceTemplateSummary();
	const actions = useServiceActions();

	// "Todos" is active again when the active chip disappears (R14)
	const summaryData = summary.data;
	const gone = summaryData ? !chipExists(chosen, summaryData) : false;
	const active = gone ? ALL_CHIP : chosen;
	useEffect(() => {
		if (gone) setChosen(ALL_CHIP);
	}, [gone]);

	const status: ServiceStatusFilter =
		active === ARCHIVED_CHIP ? "inactive" : "active";
	const formId =
		active === ALL_CHIP || active === ARCHIVED_CHIP ? undefined : active;
	const sort: ServiceSort = active === ALL_CHIP ? "form" : "name";

	const list = useServiceList({
		layout: "narrow",
		q: search.q,
		status,
		formId,
		sort,
	});
	const lastRef = useReachEnd(list.loadNext);

	// back to the top on any change of the query (R11)
	// biome-ignore lint/correctness/useExhaustiveDependencies: the key is the trigger
	useEffect(() => {
		window.scrollTo({ top: 0 });
	}, [search.q, active]);

	useEffect(() => {
		if (searchOpen) searchRef.current?.querySelector("input")?.focus();
	}, [searchOpen]);

	function toggleSearch() {
		if (searchOpen) search.setInput("");
		setSearchOpen(!searchOpen);
	}

	const chips: ChipsState = summary.isError
		? { status: "error", retry: () => void summary.refetch() }
		: summaryData
			? { status: "ready", summary: summaryData }
			: { status: "loading" };

	const activeTemplate = summaryData?.templates.find(
		(template) => template.id === formId,
	);
	const fabTemplate =
		activeTemplate?.status === "active" ? activeTemplate.id : null;

	const base = `/orgs/${tenant}/services`;
	const hasRows = list.rows.length > 0;
	const ready = !list.pending && !list.error;
	const sections = sectionsOf(list.rows);
	const lastRow = list.rows.at(-1);

	return (
		<div className="flex w-full flex-col max-w-3xl gap-4 p-4 pb-24">
			<div className="flex items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				<button
					type="button"
					aria-label={t("list.searchOpen")}
					aria-expanded={searchOpen}
					onClick={toggleSearch}
					className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
				>
					<SearchIcon aria-hidden="true" className="size-5" />
				</button>
			</div>

			{searchOpen && (
				<div ref={searchRef}>
					<ListToolbar
						namespace="services"
						input={search.input}
						onInput={search.setInput}
						shortInput={search.shortInput}
					/>
				</div>
			)}

			<ServiceChips state={chips} active={active} onSelect={setChosen} />

			{list.pending && (
				<output
					aria-label={t("list.loading")}
					aria-busy="true"
					className="flex flex-col gap-3"
				>
					{[0, 1, 2, 3].map((row) => (
						<Skeleton key={row} className="h-12 w-full" />
					))}
				</output>
			)}

			{list.error && (
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("list.error")}</Alert>
					<Button
						variant="subtle"
						text={t("form.retry")}
						className="w-auto"
						onPress={list.refetch}
					/>
				</div>
			)}

			{ready && !hasRows && (
				<p className="font-body-md text-text-secondary">
					{search.q
						? t("list.noResults", { q: search.q })
						: list.empty === "filter"
							? t("list.emptyFilter")
							: t("list.empty")}
				</p>
			)}

			{ready && hasRows && (
				<div className="flex flex-col gap-2 p-2 bg-surface-sunken rounded-lg">
					<SwipeRowGroup>
						<div className="flex flex-col gap-4">
							{sections.map((section) => (
								<section
									key={`${section.formId}-${section.rows[0]?.id}`}
									className="flex flex-col gap-2"
								>
									{active === ALL_CHIP && (
										<h2 className="px-1 font-body-sm font-semibold text-text-secondary">
											{section.formName}
										</h2>
									)}
									<ul className="flex flex-col gap-2">
										{section.rows.map((service) => (
											<li
												key={service.id}
												ref={service === lastRow ? lastRef : undefined}
												className="overflow-hidden rounded-md bg-surface-raised"
											>
												<ServiceSwipeRow
													service={service}
													base={base}
													actions={actions}
												/>
											</li>
										))}
									</ul>
								</section>
							))}
						</div>
					</SwipeRowGroup>
					<ListEnd
						namespace="services"
						loaded={list.rows.length}
						total={list.total}
						announce={list.pageCount > 1}
						loading={list.isFetchingNextPage}
						failed={list.isFetchNextPageError}
						hasNext={list.hasNextPage}
						onRetry={list.retryNext}
					/>
				</div>
			)}

			{actions.dialog}
			<ServiceFab templateId={fabTemplate} />
		</div>
	);
}
