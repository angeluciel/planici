"use client";

import type { ClientStatusFilter } from "@planici/schemas";
import { ListToolbar } from "../../_components/list/list-toolbar";

const STATUSES = ["active", "inactive", "all"] as const;

export function ClientsToolbar(
	props: Readonly<{
		input: string;
		onInput: (value: string) => void;
		shortInput: boolean;
		status: ClientStatusFilter;
		onStatus: (value: ClientStatusFilter) => void;
	}>,
) {
	return <ListToolbar namespace="clients" statuses={STATUSES} {...props} />;
}
