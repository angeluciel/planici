"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Layout } from "./use-layout";

export type EmptyKind = "none" | "filter";

export type ListPage<Item> = {
	items: Item[];
	total: number;
	nextCursor: string | null;
	empty?: EmptyKind;
};

export type ListFetchArgs<Status extends string, Sort extends string> = {
	q?: string;
	status: Status;
	formId?: string;
	sort?: Sort;
	after?: string;
	limit?: number;
};

export type ListFetcher<Item, Status extends string, Sort extends string> = (
	args: ListFetchArgs<Status, Sort>,
) => Promise<
	| { ok: true; page: Omit<ListPage<Item>, "empty"> }
	| { ok: false; error: string }
>;

export type ListInputs<Status extends string, Sort extends string> = {
	layout: Layout | null;
	q: string | undefined;
	status: Status;
	formId: string | undefined;
	sort: Sort | undefined;
};

// The list's pages (SPEC-0006 §11, G-7): one request at a time, none after a
// failure until the user retries, and each key keeps its own pages. `key` is
// the query-key root; `allStatus` is the status that matches every row, used
// for the "is there any row at all?" probe (SPEC-0004 Decision 6).
export function useListQuery<Item, Status extends string, Sort extends string>({
	key,
	allStatus,
	fetchPage,
	...inputs
}: ListInputs<Status, Sort> & {
	key: string;
	allStatus: Status;
	fetchPage: ListFetcher<Item, Status, Sort>;
}) {
	const { tenant } = useParams<{ tenant: string }>();
	const { layout, q, status, formId, sort } = inputs;

	const query = useInfiniteQuery({
		queryKey: [key, "list", tenant, { layout, q, status, formId, sort }],
		retry: false,
		refetchOnWindowFocus: false,
		gcTime: 0,
		enabled: layout !== null,
		initialPageParam: undefined as string | undefined,
		queryFn: async ({ pageParam }): Promise<ListPage<Item>> => {
			const result = await fetchPage({
				q,
				status,
				formId,
				sort,
				after: pageParam,
			});
			if (!result.ok) throw new Error(result.error);
			const page: ListPage<Item> = { ...result.page };
			if (pageParam === undefined && page.items.length === 0 && !q) {
				let empty: EmptyKind = "none";
				if (status !== allStatus || formId) {
					const any = await fetchPage({ status: allStatus, limit: 1 });
					if (!any.ok || any.page.items.length > 0) empty = "filter";
				}
				page.empty = empty;
			}
			return page;
		},
		getNextPageParam: (last) => last.nextCursor ?? undefined,
	});

	const pages = query.data?.pages ?? [];
	const rows: Item[] = pages.flatMap((page) => page.items);
	const nextFailed = query.isFetchNextPageError;

	function loadNext() {
		if (!query.hasNextPage || query.isFetchingNextPage || nextFailed) return;
		void query.fetchNextPage();
	}

	return {
		rows,
		total: pages.at(-1)?.total ?? 0,
		empty: pages[0]?.empty ?? null,
		pageCount: pages.length,
		pending: query.data === undefined && !query.isError,
		error: query.isError && query.data === undefined,
		refetch: () => void query.refetch(),
		isFetchingNextPage: query.isFetchingNextPage,
		isFetchNextPageError: nextFailed,
		retryNext: () => void query.fetchNextPage(),
		hasNextPage: query.hasNextPage,
		loadNext,
	};
}
