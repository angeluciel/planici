"use client";

import { RecordView } from "../../_components/records/record-view";
import { ClientActions } from "./client-actions";
import { useClientAdapter } from "./client-adapter";

// /clients/[clientId]: the shared view plus the client's actions (G-1).
export function ClientViewPage({ clientId }: Readonly<{ clientId: string }>) {
	const adapter = useClientAdapter();

	return (
		<RecordView
			adapter={adapter}
			recordId={clientId}
			actions={(record, reload) => (
				<ClientActions record={record} reload={reload} />
			)}
		/>
	);
}
