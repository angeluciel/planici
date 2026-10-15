"use client";

import { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar/sidebar";

export default function AppShell({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	return (
		<>
			<Header
				isSidebarOpen={isSidebarOpen}
				onOpenSidebar={() => setIsSidebarOpen(true)}
			/>

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
			/>

			<main className="md:pl-70">{children}</main>
		</>
	);
}
