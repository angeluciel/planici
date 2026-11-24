"use client";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import type { ReactNode, RefObject } from "react";

type FocusTarget =
	| boolean
	| RefObject<HTMLElement | null>
	| (() => HTMLElement | boolean | null | undefined);

type SheetProps = {
	open: boolean;
	// called for Escape, a press on the backdrop, swiping down and the close button
	onClose: () => void;
	title: ReactNode;
	// text of the close button, the last control of the sheet
	closeLabel: string;
	id?: string;
	initialFocus?: FocusTarget;
	finalFocus?: FocusTarget;
	children: ReactNode;
};

// Modal bottom sheet for narrow screens. The popup is role="dialog", named by
// its title. No transitions: motion is added app-wide later.
export function Sheet({
	open,
	onClose,
	title,
	closeLabel,
	id,
	initialFocus,
	finalFocus,
	children,
}: Readonly<SheetProps>) {
	return (
		<BaseDrawer.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<BaseDrawer.Portal>
				<BaseDrawer.Backdrop className="fixed inset-0 z-50 bg-blanket" />
				<BaseDrawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
					<BaseDrawer.Popup
						id={id}
						initialFocus={initialFocus}
						finalFocus={finalFocus}
						className="flex max-h-[85dvh] w-full flex-col overflow-y-auto overscroll-contain rounded-t-lg bg-surface-overlay px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-text-primary shadow-overlay outline-none [transform:translateY(var(--drawer-swipe-movement-y))]"
					>
						<div
							aria-hidden="true"
							className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-background-accent-gray-subtle"
						/>
						<BaseDrawer.Content className="flex flex-col gap-1">
							<BaseDrawer.Title className="pb-1 font-body-md font-semibold text-text-bold">
								{title}
							</BaseDrawer.Title>
							{children}
							{/* last, so the content's first control is the sheet's first
							    control (SPEC-0002 AC-0002-55); visual order matches */}
							<BaseDrawer.Close className="mt-2 flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md font-body-sm font-medium text-text-primary hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused">
								{closeLabel}
							</BaseDrawer.Close>
						</BaseDrawer.Content>
					</BaseDrawer.Popup>
				</BaseDrawer.Viewport>
			</BaseDrawer.Portal>
		</BaseDrawer.Root>
	);
}
