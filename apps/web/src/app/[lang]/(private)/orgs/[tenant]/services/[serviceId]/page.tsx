import { ServiceViewPage } from "../_components/service-view-page";

export default async function ServiceRoute({
	params,
}: Readonly<{ params: Promise<{ serviceId: string }> }>) {
	const { serviceId } = await params;

	return <ServiceViewPage serviceId={serviceId} />;
}
