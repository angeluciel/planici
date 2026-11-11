"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentPropsWithoutRef } from "react";

type SwitchProps = Omit<
	ComponentPropsWithoutRef<typeof BaseSwitch.Root>,
	"className" | "children"
>;

// Toggle with role="switch". The accessible name comes from `aria-labelledby`
// or `aria-label`, which the caller must pass.
export function Switch(props: Readonly<SwitchProps>) {
	return (
		<BaseSwitch.Root
			{...props}
			className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-background-accent-gray-subtle transition-colors duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused data-checked:bg-background-brand-bold data-disabled:cursor-not-allowed data-disabled:opacity-60"
		>
			<BaseSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface-overlay shadow-overlay transition-transform duration-100 ease-out data-checked:translate-x-4.5" />
		</BaseSwitch.Root>
	);
}
