"use client";

import {
	CLIENT_SEARCH_MIN_LENGTH,
	type ClientSort,
	type ClientStatusFilter,
} from "@planici/schemas";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientCards } from "./client-cards";
import { ClientRows } from "./client-rows";
import { ClientsPickers } from "./clients-pickers";
import { ClientsToolbar } from "./clients-toolbar";
import { ListEnd } from "./list-end";
import { NewClientMenu } from "./new-client-menu";
import { useClientList } from "./use-client-list";
import { useLayout } from "./use-layout";
import { useReachEnd } from "./use-reach-end";

const DEBOUNCE_MS = 300;

const length = (text: string) => [...text].length;

export function ClientsList() {
	const t = useTranslations("clients");
	const { tenant } = useParams<{ tenant: string }>();
	const layout = useLayout();
	const wide = layout === "wide";
	const [input, setInput] = useState("");
	const [debounced, setDebounced] = useState("");
	const [status, setStatus] = useState<ClientStatusFilter>("active");
	// kept while the screen is narrow, so widening restores them (§4.6 step 6)
	const [formId, setFormId] = useState<string | null>(null);
	const [sort, setSort] = useState<ClientSort | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	const trimmed = debounced.trim();
	const q = length(trimmed) >= CLIENT_SEARCH_MIN_LENGTH ? trimmed : undefined;
	const shortInput =
		length(input.trim()) > 0 && length(input.trim()) < CLIENT_SEARCH_MIN_LENGTH;
	const effectiveForm = wide ? (formId ?? undefined) : undefined;
	const effectiveSort = wide ? (sort ?? undefined) : undefined;

	const list = useClientList({
		layout,
		q,
		status,
		formId: effectiveForm,
		sort: effectiveSort,
	});
	const lastRef = useReachEnd(list.loadNext);

	// back to the top on any change of the query, a new visit included (R8)
	// biome-ignore lint/correctness/useExhaustiveDependencies: the key is the trigger
	useEffect(() => {
		if (layout === null) return;
		window.scrollTo({ top: 0 });
	}, [layout, q, status, effectiveForm, effectiveSort]);

	const base = `/orgs/${tenant}/clients`;
	const hasRows = list.rows.length > 0;
	const ready = !list.pending && !list.error;

	return (
		<div className="flex w-full flex-col max-w-3xl gap-6 p-4 pb-24 md:p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				{layout !== null && (
					<NewClientMenu appearance={wide ? "button" : "floating"} />
				)}
			</div>

			<ClientsToolbar
				input={input}
				onInput={setInput}
				shortInput={shortInput}
				status={status}
				onStatus={setStatus}
			/>

			<ClientsPickers
				wide={wide}
				formId={formId}
				onFormId={setFormId}
				sort={sort}
				onSort={setSort}
			/>

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
					{q
						? t("list.noResults", { q })
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
						{wide ? (
							<ClientRows rows={list.rows} base={base} lastRef={lastRef} />
						) : (
							<ClientCards rows={list.rows} base={base} lastRef={lastRef} />
						)}
						<ListEnd
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
