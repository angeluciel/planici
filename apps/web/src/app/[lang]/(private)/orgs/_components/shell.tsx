"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import Header from "./header";
import Sidebar from "./sidebar/sidebar";
import { useSidebarMode } from "./sidebar/use-sidebar-mode";

export default function AppShell({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { mode, changeMode } = useSidebarMode();
	const pathname = usePathname();
	const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

	useEffect(() => {
		if (pathname) closeSidebar();
	}, [pathname, closeSidebar]);

	return (
		<>
			<Sidebar
				mode={mode}
				onModeChange={changeMode}
				isSidebarOpen={isSidebarOpen}
				onClose={closeSidebar}
			/>

			<div
				className={`min-w-0 transition-[padding] duration-200 motion-reduce:transition-none ${mode === "expanded" ? "md:pl-70" : "md:pl-16"}`}
			>
				<Header
					isSidebarOpen={isSidebarOpen}
					onOpenSidebar={() => setIsSidebarOpen(true)}
				/>
				<main>{children}</main>
			</div>
		</>
	);
}
