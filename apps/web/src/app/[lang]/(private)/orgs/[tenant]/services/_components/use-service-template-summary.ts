"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getServiceTemplates } from "@/lib/api/services";

// The narrow chips' source (SPEC-0005 R14, §7). A failure is not retried by
// Query: the chips offer "Tentar novamente" instead (§9 Q25).
export function useServiceTemplateSummary() {
	const { tenant } = useParams<{ tenant: string }>();
	return useQuery({
		queryKey: ["services", "templates", tenant],
		retry: false,
		queryFn: async () => {
			const result = await getServiceTemplates();
			if (!result.ok) throw new Error(result.error);
			return result.summary;
		},
	});
}
