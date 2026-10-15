// No "use client"
import AppShell from "../_components/shell";

export default async function RootLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ lang: string }>;
}>) {
	const { lang } = await params;

	return (
		<div lang={lang}>
			<div>
				<AppShell>{children}</AppShell>
			</div>
		</div>
	);
}
