"use client";

import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useWideNav } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./content";
import SidebarModeDialog from "./sidebar-mode-dialog";
import type { SidebarMode } from "./use-sidebar-mode";

type SidebarProps = {
	mode: SidebarMode;
	onModeChange: (mode: SidebarMode) => void;
	isSidebarOpen: boolean;
	onClose: () => void;
	// the header's menu button, where focus returns when the sheet closes
	navButtonRef: RefObject<HTMLButtonElement | null>;
};

export default function Sidebar({
	mode,
	onModeChange,
	isSidebarOpen,
	onClose,
	navButtonRef,
}: Readonly<SidebarProps>) {
	const t = useTranslations();
	const wide = useWideNav();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const expanded =
		mode === "expanded" || (mode === "hover" && (hovered || focused));

	// the sheet is for narrow screens: widening closes it (AC-0008-39)
	useEffect(() => {
		if (wide) onClose();
	}, [wide, onClose]);

	// Escape, an outside press, swiping down and "Fechar" return focus to the
	// menu button; Base UI does not after an outside tap on some phones (P-9).
	// Choosing an entry closes through onNavigate and does not refocus.
	function closeAndRefocus() {
		onClose();
		requestAnimationFrame(() =>
			navButtonRef.current?.focus({ preventScroll: true }),
		);
	}

	return (
		<>
			<div
				className={cn(
					"relative z-40 hidden shrink-0 transition-[width] duration-150 motion-reduce:transition-none md:block self-stretch",
					mode === "expanded" ? "w-52" : "w-12",
				)}
			>
				<aside
					aria-label="Barra lateral"
					data-state={expanded ? "expanded" : "collapsed"}
					data-mode={mode}
					onPointerEnter={(event) => {
						if (event.pointerType !== "touch") setHovered(true);
					}}
					onPointerLeave={() => setHovered(false)}
					onFocusCapture={() => setFocused(true)}
					onBlurCapture={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget))
							setFocused(false);
					}}
					className={cn(
						"absolute inset-y-0 left-0 flex flex-col border-r border-border bg-surface px-2 transition-[width] duration-150 motion-reduce:transition-none",
						expanded ? "w-52" : "w-12",
						mode === "hover" && expanded && "shadow-overlay",
					)}
				>
					<SidebarContent expanded={expanded} />
					<div className="shrink-0 border-t border-border py-2">
						<SidebarModeDialog
							expanded={expanded}
							mode={mode}
							onModeChange={onModeChange}
						/>
					</div>
				</aside>
			</div>

			<Sheet
				open={isSidebarOpen && !wide}
				onClose={closeAndRefocus}
				title={t("shell.nav.title")}
				closeLabel={t("common.close")}
				finalFocus={navButtonRef}
			>
				<SidebarContent expanded onNavigate={onClose} />
			</Sheet>
		</>
	);
}
