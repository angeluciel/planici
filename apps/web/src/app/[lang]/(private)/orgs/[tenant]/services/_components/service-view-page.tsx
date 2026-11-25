"use client";

import { useTranslations } from "next-intl";
import { RecordView } from "../../_components/records/record-view";
import { ServiceActions } from "./service-actions";
import { useServiceAdapter } from "./service-adapter";

// /services/[serviceId]: the shared view plus the service's actions; the
// breadcrumb and "Voltar" lead to the service list (SPEC-0003 §4.2 item 5).
export function ServiceViewPage({
	serviceId,
}: Readonly<{ serviceId: string }>) {
	const t = useTranslations("services");
	const adapter = useServiceAdapter();

	return (
		<RecordView
			adapter={adapter}
			recordId={serviceId}
			trail={[{ label: t("list.title"), href: adapter.listHref }]}
			backHref={adapter.listHref}
			actions={(record, reload) => (
				<ServiceActions record={record} reload={reload} />
			)}
		/>
	);
}
