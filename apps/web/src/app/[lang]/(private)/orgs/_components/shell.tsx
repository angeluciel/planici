"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
	// the header's menu button: the navigation sheet returns focus to it
	const navButtonRef = useRef<HTMLButtonElement>(null);

	// Close the navigation when the route changes. Not on mount: the sheet
	// starts closed, and an open requested before this first effect runs
	// would be cancelled.
	const shownPathname = useRef(pathname);
	useEffect(() => {
		if (shownPathname.current === pathname) return;
		shownPathname.current = pathname;
		closeSidebar();
	}, [pathname, closeSidebar]);

	return (
		<QueryProvider>
			<ToastProvider>
				<div className="flex h-dvh flex-col flex-1">
					<div className="shrink-0">
						<Header
							navOpen={isSidebarOpen}
							onOpenNav={() => setIsSidebarOpen(true)}
							navButtonRef={navButtonRef}
						/>
					</div>

					{/* Content */}
					<div className="flex min-h-0 flex-1">
						<Sidebar
							mode={mode}
							onModeChange={changeMode}
							isSidebarOpen={isSidebarOpen}
							onClose={closeSidebar}
							navButtonRef={navButtonRef}
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
