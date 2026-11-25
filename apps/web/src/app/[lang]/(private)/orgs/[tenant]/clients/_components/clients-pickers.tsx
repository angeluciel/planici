"use client";

import { CLIENT_SORTS, type ClientSort } from "@planici/schemas";
import { ListPickers } from "../../_components/list/list-pickers";
import { useClientTemplates } from "./use-client-templates";

const SORT_KEYS: Record<ClientSort, "nameAsc" | "nameDesc" | "updatedAt"> = {
	name: "nameAsc",
	"-name": "nameDesc",
	"-updatedAt": "updatedAt",
};

// The templates are read on every screen, as the [Novo] menu reads them too.
export function ClientsPickers(
	props: Readonly<{
		wide: boolean;
		formId: string | null;
		onFormId: (value: string | null) => void;
		sort: ClientSort | null;
		onSort: (value: ClientSort) => void;
	}>,
) {
	const templates = useClientTemplates().data;
	return (
		<ListPickers
			namespace="clients"
			templates={templates}
			sorts={CLIENT_SORTS}
			sortKeys={SORT_KEYS}
			{...props}
		/>
	);
}
