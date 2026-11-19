"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { XIcon } from "lucide-react";
import type { ComponentProps, ReactNode, RefObject } from "react";

type PositionerProps = ComponentProps<typeof BasePopover.Positioner>;

type FocusTarget =
	| boolean
	| RefObject<HTMLElement | null>
	| (() => HTMLElement | boolean | null | undefined);

type PopoverProps = {
	open: boolean;
	onClose: () => void;
	anchor: RefObject<Element | null> | (() => Element | null);
	side?: PositionerProps["side"];
	align?: PositionerProps["align"];
	sideOffset?: number;
	title: ReactNode;
	closeLabel: string;
	id?: string;
	initialFocus?: FocusTarget;
	finalFocus?: FocusTarget;
	children: ReactNode;
};

export function Popover({
	open,
	onClose,
	anchor,
	side = "right",
	align = "start",
	sideOffset = 16,
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
					side={side}
					align={align}
					sideOffset={sideOffset}
					className="z-40"
				>
					<BasePopover.Popup
						id={id}
						initialFocus={initialFocus}
						finalFocus={finalFocus}
						className="relative flex max-h-(--available-height) w-72 flex-col gap-1 overflow-y-auto rounded-lg border border-border-bold bg-surface-overlay px-1.5 pb-1 pt-3 text-text-primary shadow-overlay focus:outline-none"
					>
						<BasePopover.Title className="pl-2 pb-1 font-heading-2xs font-medium text-text-bold">
							{title}
						</BasePopover.Title>
						{children}
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
