"use client";

import { RecordForm } from "../../_components/records/record-form";
import { useServiceAdapter } from "./service-adapter";

// /services/[serviceId]/edit
export function ServiceEditPage({
	serviceId,
}: Readonly<{ serviceId: string }>) {
	const adapter = useServiceAdapter();

	return <RecordForm adapter={adapter} mode="edit" recordId={serviceId} />;
}
