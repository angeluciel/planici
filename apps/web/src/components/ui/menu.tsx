"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

const TRIGGER = {
	icon: "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-subtle hover:bg-surface-hovered focus-visible:outline-2 focus-visible:outline-border-focused data-popup-open:bg-surface-pressed",
	row: "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-1 font-body-sm text-text-primary hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused data-popup-open:bg-surface-overlay-hovered",
} as const;

// Action menu: the trigger is a button with the caller's accessible name; the
// popup is role="menu" and arrow keys move between its items.
// `icon` look: `trigger` is the icon. `row` look: a full-width list row that
// shows `label` and a chevron (settings panels); `trigger` is ignored.
export function Menu({
	label,
	trigger,
	appearance = "icon",
	children,
}: Readonly<{
	label: string;
	trigger?: ReactNode;
	appearance?: "icon" | "row";
	children: ReactNode;
}>) {
	return (
		<BaseMenu.Root>
			<BaseMenu.Trigger
				aria-label={appearance === "icon" ? label : undefined}
				className={TRIGGER[appearance]}
				onKeyDown={(event) => {
					// Enter opens on keydown, as a native button does, without relying
					// on the browser to turn the key into a click
					if (event.key !== "Enter" || event.repeat) return;
					event.preventDefault();
					event.currentTarget.click();
				}}
			>
				{appearance === "row" ? (
					<>
						<span>{label}</span>
						<ChevronRightIcon
							aria-hidden="true"
							className="ml-auto size-4 text-icon-subtle"
						/>
					</>
				) : (
					trigger
				)}
			</BaseMenu.Trigger>
			<BaseMenu.Portal>
				<BaseMenu.Positioner
					side={appearance === "row" ? "right" : "bottom"}
					align={appearance === "row" ? "start" : "end"}
					sideOffset={4}
					className="z-50"
				>
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
