"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

type DialogProps = {
	open: boolean;
	// called for Escape, outside press and the close button
	onClose: () => void;
	// false while a request runs: Escape, outside press and the close button do nothing
	dismissible?: boolean;
	title: ReactNode;
	description?: ReactNode;
	// accessible name of the close button
	closeLabel: string;
	children?: ReactNode;
	// action buttons, right aligned
	footer?: ReactNode;
};

export function Dialog({
	open,
	onClose,
	dismissible = true,
	title,
	description,
	closeLabel,
	children,
	footer,
}: Readonly<DialogProps>) {
	return (
		<BaseDialog.Root
			open={open}
			disablePointerDismissal={!dismissible}
			onOpenChange={(next) => {
				if (!next && dismissible) onClose();
			}}
		>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-50 bg-blanket" />
				<BaseDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface-overlay p-6 text-text-primary shadow-overlay focus:outline-none">
					<div className="flex items-start justify-between gap-4">
						<BaseDialog.Title className="font-heading-xs text-text-bold">
							{title}
						</BaseDialog.Title>
						{dismissible && (
							<button
								type="button"
								aria-label={closeLabel}
								onClick={onClose}
								className="flex size-8 shrink-0 items-center justify-center rounded-md text-icon-subtle hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
							>
								<XIcon aria-hidden="true" className="size-5" />
							</button>
						)}
					</div>
					{description && (
						<BaseDialog.Description className="font-body-sm text-text-secondary">
							{description}
						</BaseDialog.Description>
					)}
					{children}
					{footer && (
						<div className="flex flex-wrap justify-end gap-2">{footer}</div>
					)}
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}
