"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { XIcon } from "lucide-react";
import type { ReactNode, RefObject } from "react";

type FocusTarget =
	| boolean
	| RefObject<HTMLElement | null>
	| (() => HTMLElement | boolean | null | undefined);

type PopoverProps = {
	open: boolean;
	// called for Escape and the close button only: outside presses and focus
	// moving away keep the popover open, so the caller decides when it closes
	onClose: () => void;
	// the element the popup sits beside
	anchor: RefObject<Element | null> | (() => Element | null);
	title: ReactNode;
	// accessible name of the close button
	closeLabel: string;
	id?: string;
	initialFocus?: FocusTarget;
	finalFocus?: FocusTarget;
	children: ReactNode;
};

// Non-modal panel anchored to an element, on its right when there is room.
// The popup is role="dialog", named by its title.
export function Popover({
	open,
	onClose,
	anchor,
	title,
	closeLabel,
	id,
	initialFocus,
	finalFocus,
	children,
}: Readonly<PopoverProps>) {
	return (
		<BasePopover.Root
			open={open}
			onOpenChange={(next, details) => {
				if (next) return;
				if (
					details.reason === "escape-key" ||
					details.reason === "close-press"
				) {
					onClose();
				}
			}}
		>
			<BasePopover.Portal>
				<BasePopover.Positioner
					anchor={anchor}
					side="right"
					align="start"
					sideOffset={16}
					className="z-40"
				>
					<BasePopover.Popup
						id={id}
						initialFocus={initialFocus}
						finalFocus={finalFocus}
						className="flex w-72 flex-col gap-1 rounded-lg border border-border-bold bg-surface-overlay p-3 text-text-primary shadow-overlay focus:outline-none"
					>
						<div className="flex items-center justify-between gap-2 pb-1">
							<BasePopover.Title className="font-body-md font-semibold text-text-bold">
								{title}
							</BasePopover.Title>
							<BasePopover.Close
								aria-label={closeLabel}
								className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-icon-subtle hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
							>
								<XIcon aria-hidden="true" className="size-4" />
							</BasePopover.Close>
						</div>
						{children}
					</BasePopover.Popup>
				</BasePopover.Positioner>
			</BasePopover.Portal>
		</BasePopover.Root>
	);
}
