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
	// called for Escape, the close button and a click on the page outside
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

// Modal panel anchored to an element, on its right when there is room. The
// popup is role="dialog", named by its title. While it is open the rest of the
// page is hidden from assistive technology, cannot scroll, and keeps Tab out.
//
// A transparent backdrop covers the page, so hover, clicks and drag presses
// land on it. It closes the popup on its click, not on the press: base-ui
// closes on a touch press, which would remove the backdrop before the tap's
// click and let that click reach whatever is underneath.
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
			modal
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
				<BasePopover.Backdrop
					role="presentation"
					className="fixed inset-0 z-40"
					onClick={onClose}
				/>
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
						className="relative flex max-h-(--available-height) w-72 flex-col gap-1 overflow-y-auto rounded-lg border border-border-bold bg-surface-overlay p-3 text-text-primary shadow-overlay focus:outline-none"
					>
						<BasePopover.Title className="pr-8 pb-1 font-body-md font-semibold text-text-bold">
							{title}
						</BasePopover.Title>
						{children}
						{/* after the content, so its first control is the panel's first
						    control and Tab reaches the close button last; it still sits
						    in the top-right corner */}
						<BasePopover.Close
							aria-label={closeLabel}
							className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full text-icon-subtle hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
						>
							<XIcon aria-hidden="true" className="size-4" />
						</BasePopover.Close>
					</BasePopover.Popup>
				</BasePopover.Positioner>
			</BasePopover.Portal>
		</BasePopover.Root>
	);
}
