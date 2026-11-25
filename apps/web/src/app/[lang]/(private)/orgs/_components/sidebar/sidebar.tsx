"use client";

import {
	BookOpenIcon,
	Calendar1Icon,
	ChartLineIcon,
	CheckCircle2Icon,
	CoinsIcon,
	Settings2Icon,
	UserRoundPenIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./content";
import SidebarModeDialog from "./sidebar-mode-dialog";
import type { SidebarMode } from "./use-sidebar-mode";

type SidebarProps = {
	mode: SidebarMode;
	onModeChange: (mode: SidebarMode) => void;
	isSidebarOpen: boolean;
	onClose: () => void;
};

export default function Sidebar({
	mode,
	onModeChange,
	isSidebarOpen,
	onClose,
}: Readonly<SidebarProps>) {
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const expanded =
		mode === "expanded" || (mode === "hover" && (hovered || focused));

	useEffect(() => {
		const desktop = window.matchMedia("(min-width: 768px)");
		const closeOnDesktop = () => {
			if (desktop.matches) onClose();
		};
		closeOnDesktop();
		desktop.addEventListener("change", closeOnDesktop);
		return () => desktop.removeEventListener("change", closeOnDesktop);
	}, [onClose]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (isSidebarOpen && !window.matchMedia("(min-width: 768px)").matches) {
			if (!dialog.open) dialog.showModal();
			const previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = previousOverflow;
			};
		}
		if (dialog.open) dialog.close();
	}, [isSidebarOpen]);

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

			<dialog
				ref={dialogRef}
				id="mobile-sidebar"
				aria-label="Menu principal"
				onCancel={(event) => {
					event.preventDefault();
					onClose();
				}}
				onClose={onClose}
				className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-text-primary backdrop:bg-blanket md:hidden"
			>
				<div className="relative flex h-full">
					<div className="relative z-10 flex h-full w-[min(20rem,calc(100%-3rem))] flex-col bg-surface-raised px-2 shadow-overlay">
						<div className="flex shrink-0 justify-end pt-2">
							<button
								type="button"
								aria-label="Fechar menu"
								onClick={onClose}
								className="flex size-11 items-center justify-center rounded-md text-icon hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
							>
								<XIcon aria-hidden="true" className="size-5" />
							</button>
						</div>
						<SidebarContent expanded onNavigate={onClose} />
					</div>
					<button
						type="button"
						aria-label="Fechar menu pelo fundo"
						tabIndex={-1}
						onClick={onClose}
						className="absolute inset-0"
					/>
				</div>
			</dialog>
		</>
	);
}
