"use client";

import type { ServiceSort, ServiceStatusFilter } from "@planici/schemas";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListEnd } from "../../_components/list/list-end";
import { type Layout, useLayout } from "../../_components/list/use-layout";
import { useReachEnd } from "../../_components/list/use-reach-end";
import { NewServiceMenu } from "./new-service-menu";
import { ServiceRows } from "./service-rows";
import { ServicesNarrowList } from "./services-narrow-list";
import { ServicesPickers } from "./services-pickers";
import { ServicesToolbar } from "./services-toolbar";
import { useServiceList } from "./use-service-list";
import { useServiceSearch } from "./use-service-search";

// /services (SPEC-0005 §4.1, R11): SPEC-0006's rows, search, status filter,
// Modelo control, sort and total on wide screens; chips and swipe rows on
// narrow ones (R14, R15). No layout is known until the client has mounted.
export function ServicesList() {
	const layout = useLayout();
	if (layout === "narrow") return <ServicesNarrowList />;
	return <ServicesWideList layout={layout} />;
}

function ServicesWideList({ layout }: Readonly<{ layout: Layout | null }>) {
	const t = useTranslations("services");
	const { tenant } = useParams<{ tenant: string }>();
	const search = useServiceSearch();
	const [status, setStatus] = useState<ServiceStatusFilter>("active");
	const [formId, setFormId] = useState<string | null>(null);
	const [sort, setSort] = useState<ServiceSort | null>(null);

	const list = useServiceList({
		layout,
		q: search.q,
		status,
		formId: formId ?? undefined,
		sort: sort ?? undefined,
	});
	const lastRef = useReachEnd(list.loadNext);

	// back to the top on any change of the query, a new visit included (R11)
	// biome-ignore lint/correctness/useExhaustiveDependencies: the key is the trigger
	useEffect(() => {
		if (layout === null) return;
		window.scrollTo({ top: 0 });
	}, [layout, search.q, status, formId, sort]);

	const base = `/orgs/${tenant}/services`;
	const hasRows = list.rows.length > 0;
	const ready = !list.pending && !list.error;

	return (
		<div className="flex w-full flex-col max-w-3xl gap-6 p-4 pb-24 md:p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				{layout !== null && <NewServiceMenu appearance="button" />}
			</div>

			<ServicesToolbar
				input={search.input}
				onInput={search.setInput}
				shortInput={search.shortInput}
				status={status}
				onStatus={setStatus}
			/>

			{layout !== null && (
				<ServicesPickers
					formId={formId}
					onFormId={setFormId}
					sort={sort}
					onSort={setSort}
				/>
			)}

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
				<div className="flex flex-col gap-1">
					<p className="font-body-sm text-text-secondary">
						{t("list.count", { count: list.total })}
					</p>
					<div className="flex flex-col gap-2 p-2 bg-surface-sunken rounded-lg">
						<ServiceRows rows={list.rows} base={base} lastRef={lastRef} />
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
				</div>
			)}
		</div>
	);
}
