"use client";

import clsx from "clsx";
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
import SidebarModeDialog from "./sidebar-mode-dialog";
import type { SidebarMode } from "./use-sidebar-mode";

type SidebarProps = {
	mode: SidebarMode;
	onModeChange: (mode: SidebarMode) => void;
	isSidebarOpen: boolean;
	onClose: () => void;
};

const groups = [
	{ label: "Agenda", items: [{ label: "Agenda Rápida", icon: Calendar1Icon }] },
	{
		label: "Trabalho",
		items: [
			{ label: "Clientes", icon: UserRoundPenIcon, path: "clients" },
			{ label: "Serviços", icon: CoinsIcon },
			{ label: "Pacotes e Planos", icon: BookOpenIcon },
			{ label: "Formulários", icon: CheckCircle2Icon },
		],
	},
	{
		label: "Contas",
		items: [
			{ label: "Faturas", icon: WalletCardsIcon },
			{ label: "Dashboard", icon: ChartLineIcon },
		],
	},
] as const;

function SidebarContent({
	expanded,
	onNavigate,
}: Readonly<{ expanded: boolean; onNavigate?: () => void }>) {
	const { tenant } = useParams<{ tenant: string }>();
	const pathname = usePathname();
	const labelClass = clsx("whitespace-nowrap", !expanded && "sr-only");
	const itemClass =
		"flex min-h-11 w-full shrink-0 items-center gap-3 rounded-md px-3 font-body-sm text-text-secondary hover:bg-surface-hovered hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focused";

	return (
		<>
			<div className="flex h-20 shrink-0 items-center gap-3 overflow-hidden px-1">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blanket font-body-sm">
					LB
				</div>
				<div className={labelClass}>
					<h2 className="font-heading-2xs text-text-primary">user name</h2>
					<span className="font-body-sm text-text-secondary">ver perfil</span>
				</div>
			</div>
			<nav
				aria-label="Menu principal"
				className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
			>
				{groups.map((group, index) => (
					<section
						key={group.label}
						aria-label={group.label}
						className={clsx(
							"flex flex-col gap-1 py-3",
							index > 0 && "border-t border-border",
						)}
					>
						{index > 0 && (
							<div className="h-6 px-3">
								<h2
									className={clsx(
										"font-heading-2xs text-text-secondary",
										!expanded && "sr-only",
									)}
								>
									{group.label}
								</h2>
							</div>
						)}
						{group.items.map((item) => {
							const Icon = item.icon;
							const href =
								"path" in item ? `/orgs/${tenant}/${item.path}` : undefined;
							const active =
								href !== undefined &&
								(pathname === href || pathname.startsWith(`${href}/`));
							const content = (
								<>
									<Icon aria-hidden="true" className="size-5 shrink-0" />
									<span className={labelClass}>{item.label}</span>
								</>
							);
							return href ? (
								<Link
									key={item.label}
									href={href}
									onClick={onNavigate}
									aria-current={active ? "page" : undefined}
									title={!expanded ? item.label : undefined}
									className={clsx(
										itemClass,
										active && "bg-surface-pressed font-medium text-text-bold",
									)}
								>
									{content}
								</Link>
							) : (
								// These pages do not exist yet; do not send users to invented routes.
								<button
									key={item.label}
									type="button"
									disabled
									title={`${item.label} — em breve`}
									className={clsx(itemClass, "cursor-not-allowed opacity-50")}
								>
									{content}
								</button>
							);
						})}
					</section>
				))}
			</nav>
			<div className="shrink-0 border-t border-border py-3">
				<button
					type="button"
					disabled
					title="Configurações — em breve"
					className={clsx(itemClass, "cursor-not-allowed opacity-50")}
				>
					<Settings2Icon aria-hidden="true" className="size-5 shrink-0" />
					<span className={labelClass}>Configurações</span>
				</button>
			</div>
		</>
	);
}

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
				className={clsx(
					"fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col border-r border-border bg-surface px-2 transition-[width] duration-200 motion-reduce:transition-none md:flex",
					expanded ? "w-70" : "w-16",
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
