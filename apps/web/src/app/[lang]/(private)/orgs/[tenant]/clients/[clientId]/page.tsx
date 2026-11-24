import { ClientViewPage } from "../_components/client-view-page";

export default async function ClientRoute({
	params,
}: Readonly<{ params: Promise<{ clientId: string }> }>) {
	const { clientId } = await params;

	return <ClientViewPage clientId={clientId} />;
}
