"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactNode } from "react";

// Action menu: the trigger is a button with the caller's accessible name; the
// popup is role="menu" and arrow keys move between its items.
export function Menu({
	label,
	trigger,
	children,
}: Readonly<{ label: string; trigger: ReactNode; children: ReactNode }>) {
	return (
		<BaseMenu.Root>
			<BaseMenu.Trigger
				aria-label={label}
				className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused data-popup-open:bg-surface-pressed"
			>
				{trigger}
			</BaseMenu.Trigger>
			<BaseMenu.Portal>
				<BaseMenu.Positioner align="end" sideOffset={4} className="z-50">
					<BaseMenu.Popup className="flex min-w-44 flex-col rounded-md bg-surface-overlay py-1 text-text-primary shadow-overlay focus:outline-none">
						{children}
					</BaseMenu.Popup>
				</BaseMenu.Positioner>
			</BaseMenu.Portal>
		</BaseMenu.Root>
	);
}

export function MenuItem({
	onSelect,
	disabled,
	children,
}: Readonly<{
	onSelect: () => void;
	disabled?: boolean;
	children: ReactNode;
}>) {
	return (
		<BaseMenu.Item
			disabled={disabled}
			onClick={onSelect}
			className="flex cursor-pointer items-center gap-2 px-3 py-2 font-body-sm text-text-primary outline-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-hovered"
		>
			{children}
		</BaseMenu.Item>
	);
}
