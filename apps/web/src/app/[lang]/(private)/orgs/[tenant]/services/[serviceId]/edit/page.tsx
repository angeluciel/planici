import { ServiceEditPage } from "../../_components/service-edit-page";

export default async function ServiceEditRoute({
	params,
}: Readonly<{ params: Promise<{ serviceId: string }> }>) {
	const { serviceId } = await params;

	return <ServiceEditPage serviceId={serviceId} />;
}
