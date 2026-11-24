"use client";

import { useTranslations } from "next-intl";
import { RecordView } from "../../_components/records/record-view";
import { ClientActions } from "./client-actions";
import { useClientAdapter } from "./client-adapter";

// /clients/[clientId]: the shared view plus the client's actions (G-1); the
// breadcrumb and "Voltar" lead to the client list (SPEC-0003 §4.2 item 5).
export function ClientViewPage({ clientId }: Readonly<{ clientId: string }>) {
	const t = useTranslations("clients");
	const adapter = useClientAdapter();

	return (
		<RecordView
			adapter={adapter}
			recordId={clientId}
			trail={[{ label: t("list.title"), href: adapter.listHref }]}
			backHref={adapter.listHref}
			actions={(record, reload) => (
				<ClientActions record={record} reload={reload} />
			)}
		/>
	);
}
