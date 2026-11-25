"use client";

import type { ServiceStatusFilter } from "@planici/schemas";
import { ListToolbar } from "../../_components/list/list-toolbar";

const STATUSES = ["active", "inactive", "all"] as const;

export function ServicesToolbar(
	props: Readonly<{
		input: string;
		onInput: (value: string) => void;
		shortInput: boolean;
		status: ServiceStatusFilter;
		onStatus: (value: ServiceStatusFilter) => void;
	}>,
) {
	return <ListToolbar namespace="services" statuses={STATUSES} {...props} />;
}
