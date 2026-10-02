import { TenantIdSchema } from "@planici/schemas";
import { notFound } from "next/navigation";
import { TenantGate } from "./tenant-gate";

export default async function Layout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ tenant: string }>;
}>) {
	const { tenant } = await params;

	if (!TenantIdSchema.safeParse(tenant).success) notFound();

	return <TenantGate tenantId={tenant}>{children}</TenantGate>;
}
