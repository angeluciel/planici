"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { listForms } from "@/lib/api/forms";

// The tenant's client templates, archived ones included (SPEC-0006 G-1). The
// Modelo control and the [Novo] menu share this one query. A failed request is
// not retried (AC-0006-15): the control stays hidden.
export function useClientTemplates() {
	const { tenant } = useParams<{ tenant: string }>();
	return useQuery({
		queryKey: ["forms", "client-templates", tenant],
		retry: false,
		queryFn: async () => {
			const result = await listForms({ type: "client", includeArchived: true });
			if (!result.ok) throw new Error(result.error);
			return result.forms.filter((form) => form.type === "client");
		},
	});
}
