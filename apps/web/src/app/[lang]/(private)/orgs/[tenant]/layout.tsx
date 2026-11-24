// No "use client"
import AppShell from "../_components/shell";
import { TenantGate } from "./tenant-gate";

export default async function RootLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ lang: string; tenant: string }>;
}>) {
	const { lang, tenant } = await params;

	return (
		<div lang={lang}>
			<TenantGate tenantId={tenant}>
				<AppShell>{children}</AppShell>
			</TenantGate>
		</div>
	);
}
