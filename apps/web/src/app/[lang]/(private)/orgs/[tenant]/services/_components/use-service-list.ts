"use client";

import type {
	ServiceSort,
	ServiceStatusFilter,
	ServiceSummary,
} from "@planici/schemas";
import { listServices } from "@/lib/api/services";
import type { Layout } from "../../_components/list/use-layout";
import { useListQuery } from "../../_components/list/use-list-query";

export type ServiceListInputs = {
	layout: Layout | null;
	q: string | undefined;
	status: ServiceStatusFilter;
	formId: string | undefined;
	sort: ServiceSort | undefined;
};

async function fetchPage(args: {
	q?: string;
	status: ServiceStatusFilter;
	formId?: string;
	sort?: ServiceSort;
	after?: string;
	limit?: number;
}) {
	const result = await listServices(args);
	if (!result.ok) return result;
	const { services, total, nextCursor } = result.list;
	return { ok: true as const, page: { items: services, total, nextCursor } };
}

// The service list's pages (SPEC-0005 R11), on the shared list query. Its key
// starts with "services", so the actions' invalidation reaches it.
export function useServiceList(inputs: ServiceListInputs) {
	return useListQuery<ServiceSummary, ServiceStatusFilter, ServiceSort>({
		...inputs,
		key: "services",
		allStatus: "all",
		fetchPage,
	});
}
