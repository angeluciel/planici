"use client";

import { RecordForm } from "../../_components/records/record-form";
import { useClientAdapter } from "./client-adapter";

// /clients/[clientId]/edit: no consent checkbox, the attestation is given once
// (SPEC-0004 R12, AC-0004-31).
export function ClientEditPage({ clientId }: Readonly<{ clientId: string }>) {
	const adapter = useClientAdapter();

	return <RecordForm adapter={adapter} mode="edit" recordId={clientId} />;
}
