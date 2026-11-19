import { ClientEditPage } from "../../_components/client-edit-page";

export default async function ClientEditRoute({
	params,
}: Readonly<{ params: Promise<{ clientId: string }> }>) {
	const { clientId } = await params;

	return <ClientEditPage clientId={clientId} />;
}
