"use client";

import type {
	ClientListResponse,
	ClientSort,
	ClientStatusFilter,
	ClientSummary,
} from "@planici/schemas";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { listClients } from "@/lib/api/clients";
import type { Layout } from "./use-layout";

export type EmptyKind = "none" | "filter";
type Page = ClientListResponse & { empty?: EmptyKind };

export type ClientListInputs = {
	layout: Layout | null;
	q: string | undefined;
	status: ClientStatusFilter;
	formId: string | undefined;
	sort: ClientSort | undefined;
};

// The list's pages (SPEC-0006 §11, G-7): one request at a time, none after a
// failure until the user retries, and each key keeps its own pages.
export function useClientList(inputs: ClientListInputs) {
	const { tenant } = useParams<{ tenant: string }>();
	const { layout, q, status, formId, sort } = inputs;

	const query = useInfiniteQuery({
		queryKey: ["clients", "list", tenant, { layout, q, status, formId, sort }],
		retry: false,
		refetchOnWindowFocus: false,
		gcTime: 0,
		enabled: layout !== null,
		initialPageParam: undefined as string | undefined,
		queryFn: async ({ pageParam }): Promise<Page> => {
			const result = await listClients({
				q,
				status,
				formId,
				sort,
				after: pageParam,
			});
			if (!result.ok) throw new Error(result.error);
			const page: Page = { ...result.list };
			if (pageParam === undefined && page.clients.length === 0 && !q) {
				let empty: EmptyKind = "none";
				if (status !== "all" || formId) {
					// is there any client at all? (SPEC-0004 Decision 6)
					const any = await listClients({ status: "all", limit: 1 });
					if (!any.ok || any.list.clients.length > 0) empty = "filter";
				}
				page.empty = empty;
			}
			return page;
		},
		getNextPageParam: (last) => last.nextCursor ?? undefined,
	});

	const pages = query.data?.pages ?? [];
	const rows: ClientSummary[] = pages.flatMap((page) => page.clients);
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
