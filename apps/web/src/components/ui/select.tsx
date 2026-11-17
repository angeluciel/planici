"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type { Ref } from "react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: readonly SelectOption[];
	// accessible name of the combobox; the `row` look also shows it
	label: string;
	disabled?: boolean;
	invalid?: boolean;
	id?: string;
	describedBy?: string;
	// `field`: an input-like box. `row`: a full-width list row with the label on
	// the left and the value and a chevron on the right (settings panels)
	appearance?: "field" | "row";
	triggerRef?: Ref<HTMLButtonElement>;
	// extra attributes on the trigger, e.g. a data hook for error focus
	triggerProps?: Record<string, string>;
};

const TRIGGER = {
	field:
		"flex h-10 w-full min-w-36 cursor-pointer items-center justify-between gap-2 rounded-md border-2 border-border-input bg-transparent px-2 font-body-sm text-text-bold focus-visible:border-border-focused focus-visible:outline-none data-disabled:cursor-not-allowed data-disabled:border-border-disabled data-disabled:text-text-disabled aria-invalid:border-border-danger",
	row: "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-1 font-body-sm text-text-primary hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused data-disabled:cursor-not-allowed data-disabled:text-text-disabled aria-invalid:text-text-status-danger",
} as const;

// Single-choice dropdown with role="combobox" and role="option" items.
export function Select({
	value,
	onValueChange,
	options,
	label,
	disabled,
	invalid,
	id,
	describedBy,
	appearance = "field",
	triggerRef,
	triggerProps,
}: Readonly<SelectProps>) {
	const items = options.map(({ value: v, label: l }) => ({
		value: v,
		label: l,
	}));
	return (
		<BaseSelect.Root
			value={value}
			items={items}
			disabled={disabled}
			onValueChange={(next) => {
				if (typeof next === "string") onValueChange(next);
			}}
		>
			<BaseSelect.Trigger
				{...triggerProps}
				ref={triggerRef}
				id={id}
				aria-label={label}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				className={TRIGGER[appearance]}
			>
				{appearance === "row" ? (
					<>
						<span aria-hidden="true">{label}</span>
						<span className="ml-auto text-text-secondary">
							<BaseSelect.Value />
						</span>
						<ChevronRightIcon
							aria-hidden="true"
							className="size-4 text-icon-subtle"
						/>
					</>
				) : (
					<>
						<BaseSelect.Value />
						<BaseSelect.Icon>
							<ChevronDownIcon
								aria-hidden="true"
								className="size-4 text-icon-subtle"
							/>
						</BaseSelect.Icon>
					</>
				)}
			</BaseSelect.Trigger>
			<BaseSelect.Portal>
				<BaseSelect.Positioner sideOffset={4} className="z-50">
					<BaseSelect.Popup className="max-h-72 min-w-(--anchor-width) overflow-y-auto rounded-md bg-surface-overlay py-1 text-text-primary shadow-overlay focus:outline-none">
						{items.map((item) => (
							<BaseSelect.Item
								key={item.value}
								value={item.value}
								className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 font-body-sm outline-none data-highlighted:bg-surface-hovered"
							>
								<BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
								<BaseSelect.ItemIndicator>
									<CheckIcon
										aria-hidden="true"
										className="size-4 text-icon-selected"
									/>
								</BaseSelect.ItemIndicator>
							</BaseSelect.Item>
						))}
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
}
