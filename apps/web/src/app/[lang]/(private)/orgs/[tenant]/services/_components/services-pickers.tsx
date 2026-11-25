"use client";

import { SERVICE_SORTS, type ServiceSort } from "@planici/schemas";
import { ListPickers } from "../../_components/list/list-pickers";
import { useServiceTemplates } from "./use-service-templates";

// "form" is the narrow "Todos" sort (R11); the wide list offers the other three
const WIDE_SORTS = SERVICE_SORTS.filter((sort) => sort !== "form");

const SORT_KEYS: Record<ServiceSort, "nameAsc" | "nameDesc" | "updatedAt"> = {
	name: "nameAsc",
	"-name": "nameDesc",
	"-updatedAt": "updatedAt",
	form: "nameAsc",
};

// The templates are read on every screen, as the [Novo] menu reads them too.
export function ServicesPickers(
	props: Readonly<{
		formId: string | null;
		onFormId: (value: string | null) => void;
		sort: ServiceSort | null;
		onSort: (value: ServiceSort) => void;
	}>,
) {
	const templates = useServiceTemplates().data;
	return (
		<ListPickers
			namespace="services"
			templates={templates}
			sorts={WIDE_SORTS}
			sortKeys={SORT_KEYS}
			wide
			{...props}
		/>
	);
}
