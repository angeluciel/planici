"use client";

import type {
	ClientSort,
	ClientStatusFilter,
	ClientSummary,
} from "@planici/schemas";
import { listClients } from "@/lib/api/clients";
import type { Layout } from "../../_components/list/use-layout";
import { useListQuery } from "../../_components/list/use-list-query";

export type { EmptyKind } from "../../_components/list/use-list-query";

export type ClientListInputs = {
	layout: Layout | null;
	q: string | undefined;
	status: ClientStatusFilter;
	formId: string | undefined;
	sort: ClientSort | undefined;
};

async function fetchPage(args: {
	q?: string;
	status: ClientStatusFilter;
	formId?: string;
	sort?: ClientSort;
	after?: string;
	limit?: number;
}) {
	const result = await listClients(args);
	if (!result.ok) return result;
	const { clients, total, nextCursor } = result.list;
	return { ok: true as const, page: { items: clients, total, nextCursor } };
}

// The client list's pages (SPEC-0006 §11, G-7), on the shared list query.
export function useClientList(inputs: ClientListInputs) {
	return useListQuery<ClientSummary, ClientStatusFilter, ClientSort>({
		...inputs,
		key: "clients",
		allStatus: "all",
		fetchPage,
	});
}
