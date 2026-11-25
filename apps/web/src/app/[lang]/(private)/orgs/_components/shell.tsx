"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { usePathname } from "@/i18n/navigation";
import { QueryProvider } from "@/lib/query/query-provider";
import { cn } from "@/lib/utils";
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
		<QueryProvider>
			<ToastProvider>
				<div className="flex h-dvh flex-col flex-1">
					<div className="shrink-0">
						<Header
							isSidebarOpen={isSidebarOpen}
							onOpenSidebar={() => setIsSidebarOpen(true)}
						/>
					</div>

					{/* Content */}
					<div className="flex min-h-0 flex-1">
						<Sidebar
							mode={mode}
							onModeChange={changeMode}
							isSidebarOpen={isSidebarOpen}
							onClose={closeSidebar}
						/>
						<main className="flex flex-col items-center flex-1">
							{children}
						</main>
					</div>
				</div>
			</ToastProvider>
		</QueryProvider>
	);
}
