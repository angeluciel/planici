"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { RecordForm } from "../../_components/records/record-form";
import { useServiceAdapter } from "./service-adapter";

// /services/new?form=<id>: the fill-in page of a new service (SPEC-0005 §4.3).
// Without `form` there is nothing to fill in: back to the list.
export function NewServicePage() {
	const formId = useSearchParams().get("form");
	const { tenant } = useParams<{ tenant: string }>();
	const router = useRouter();
	const adapter = useServiceAdapter();

	useEffect(() => {
		if (!formId) router.replace(`/orgs/${tenant}/services`);
	}, [formId, router, tenant]);

	if (!formId) return null;

	return <RecordForm adapter={adapter} mode="create" formId={formId} />;
}
