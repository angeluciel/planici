"use client";

import clsx from "clsx";
import {
	MousePointer2Icon,
	PanelLeftCloseIcon,
	PanelLeftIcon,
	PanelLeftOpenIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SidebarMode } from "./use-sidebar-mode";

const modes = [
	{
		value: "hover",
		label: "Expandir ao passar o mouse",
		description: "Mostra os nomes ao passar o mouse ou navegar pelo teclado.",
		icon: MousePointer2Icon,
	},
	{
		value: "expanded",
		label: "Manter expandido",
		description: "Mantém os ícones e os nomes sempre visíveis.",
		icon: PanelLeftOpenIcon,
	},
	{
		value: "collapsed",
		label: "Manter recolhido",
		description: "Mostra apenas os ícones, mesmo ao passar o mouse.",
		icon: PanelLeftCloseIcon,
	},
] as const;

export default function SidebarModeDialog({
	expanded,
	mode,
	onModeChange,
}: Readonly<{
	expanded: boolean;
	mode: SidebarMode;
	onModeChange: (mode: SidebarMode) => void;
}>) {
	const [open, setOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const id = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open) {
			const desktop = window.matchMedia("(min-width: 768px)");
			const closeOnMobile = () => {
				if (!desktop.matches) setOpen(false);
			};
			if (!desktop.matches) {
				setOpen(false);
				return;
			}
			desktop.addEventListener("change", closeOnMobile);
			if (!dialog.open) dialog.showModal();
			const previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				desktop.removeEventListener("change", closeOnMobile);
				document.body.style.overflow = previousOverflow;
			};
		}
		if (dialog.open) dialog.close();
	}, [open]);

	return (
		<>
			<button
				type="button"
				aria-label="Comportamento da barra lateral"
				aria-haspopup="dialog"
				aria-controls={id}
				aria-expanded={open}
				title="Comportamento da barra lateral"
				onClick={() => setOpen(true)}
				className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
			>
				<PanelLeftIcon aria-hidden="true" className="size-5 shrink-0" />
				<span
					className={clsx(
						"whitespace-nowrap font-body-sm",
						!expanded && "sr-only",
					)}
				>
					Barra lateral
				</span>
			</button>
			<dialog
				id={id}
				ref={dialogRef}
				aria-labelledby={`${id}-title`}
				aria-describedby={`${id}-description`}
				onCancel={(event) => {
					event.preventDefault();
					setOpen(false);
				}}
				onClose={() => setOpen(false)}
				className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-text-primary backdrop:bg-blanket"
			>
				<div className="relative flex h-full items-center justify-center p-4">
					<button
						type="button"
						tabIndex={-1}
						aria-label="Fechar preferências pelo fundo"
						onClick={() => setOpen(false)}
						className="absolute inset-0"
					/>
					<div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-border bg-surface-overlay p-6 shadow-overlay">
						<div className="flex items-start justify-between gap-3">
							<h2 id={`${id}-title`} className="font-heading-2xs">
								Comportamento da barra lateral
							</h2>
							<button
								type="button"
								aria-label="Fechar preferências"
								onClick={() => setOpen(false)}
								className="flex size-9 shrink-0 items-center justify-center rounded-md text-icon hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
							>
								<XIcon aria-hidden="true" className="size-5" />
							</button>
						</div>
						<p
							id={`${id}-description`}
							className="mt-2 font-body-sm text-text-secondary"
						>
							Escolha como a barra lateral aparece no computador. Sua escolha é
							salva automaticamente.
						</p>
						<fieldset className="mt-5 flex flex-col gap-2">
							<legend className="sr-only">Modo no computador</legend>
							{modes.map(({ value, label, description, icon: Icon }) => (
								<label
									key={value}
									className={clsx(
										"flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-surface-hovered",
										mode === value
											? "border-border-selected bg-surface-pressed"
											: "border-border",
									)}
								>
									<input
										type="radio"
										name={`${id}-mode`}
										value={value}
										checked={mode === value}
										onChange={() => onModeChange(value)}
										aria-labelledby={`${id}-${value}-label`}
										aria-describedby={`${id}-${value}-description`}
										className="mt-1 size-4 shrink-0 accent-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
									/>
									<Icon
										aria-hidden="true"
										className="mt-0.5 size-5 shrink-0 text-icon"
									/>
									<span className="min-w-0">
										<span
											id={`${id}-${value}-label`}
											className="block font-body-sm font-medium"
										>
											{label}
										</span>
										<span
											id={`${id}-${value}-description`}
											className="mt-1 block font-body-sm text-text-secondary"
										>
											{description}
										</span>
									</span>
								</label>
							))}
						</fieldset>
						<div className="mt-5 flex justify-end">
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="min-h-11 rounded-md bg-background-brand-bold px-4 font-body-sm font-medium text-text-inverse hover:bg-background-brand-bold-hovered focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
							>
								Concluído
							</button>
						</div>
					</div>
				</div>
			</dialog>
		</>
	);
}
