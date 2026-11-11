"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

// Hover and focus hint around one element. `children` is the trigger element
// itself (it receives the hover and focus handlers). Screen readers get the
// same text through the caller's `aria-describedby`.
export function Tooltip({
	content,
	children,
}: Readonly<{ content: ReactNode; children: ReactElement }>) {
	return (
		<BaseTooltip.Provider>
			<BaseTooltip.Root>
				<BaseTooltip.Trigger render={children} />
				<BaseTooltip.Portal>
					<BaseTooltip.Positioner sideOffset={6} className="z-50">
						<BaseTooltip.Popup
							role="tooltip"
							className="max-w-64 rounded-md bg-background-accent-neutral-bold px-2 py-1 font-body-xs text-text-inverse shadow-overlay"
						>
							{content}
						</BaseTooltip.Popup>
					</BaseTooltip.Positioner>
				</BaseTooltip.Portal>
			</BaseTooltip.Root>
		</BaseTooltip.Provider>
	);
}
