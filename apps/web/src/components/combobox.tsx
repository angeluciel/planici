"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import React from "react";
import { tv } from "tailwind-variants";
import { type FieldStatus, inputVariants } from "./input";

const comboboxVariants = tv({
	slots: {
		trigger: [
			"size-sm shrink-0 text-icon-base transition-[color,transform] cursor-pointer",
			"group-focus-within/field:text-icon-selected",
			"data-[popup-open]:rotate-180",
		],
		positioner: "z-50 outline-none",
		popup: [
			"w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)]",
			"overflow-y-auto rounded-md border-2 border-border-input bg-surface-base p-1 shadow-md",
			"origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out",
			"data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
			"data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
		],
		item: [
			"flex items-center justify-between gap-2 rounded-sm px-2 py-2 cursor-default select-none",
			"hover:bg-surface",
			"font-body-sm text-text-bold outline-none",
			"data-[highlighted]:bg-background-selected-bold data-[highlighted]:text-text-inverse",
			"data-[disabled]:text-text-disabled data-[disabled]:pointer-events-none",
		],
		indicator: "size-sm shrink-0 text-icon-selected",
		empty: "px-2 py-2 font-body-sm text-text-secondary empty:hidden",
	},
});

export interface ComboboxOption {
	value: string;
	label: string;
	disabled?: boolean;
}

interface ComboboxProps {
	items: ComboboxOption[];
	value?: ComboboxOption | null;
	defaultValue?: ComboboxOption | null;
	onValueChange?: (value: ComboboxOption | null) => void;
	label?: string;
	help?: string;
	status?: FieldStatus;
	placeholder?: string;
	emptyMessage?: string;
	leadingIcon?: LucideIcon;
	disabled?: boolean;
	name?: string;
	id?: string;
	className?: string;
}

export function Combobox({
	items,
	value,
	defaultValue,
	onValueChange,
	label,
	help,
	status = "default",
	placeholder,
	emptyMessage = "No results",
	leadingIcon: LeadingIcon,
	disabled,
	name,
	id,
	className,
}: Readonly<ComboboxProps>) {
	const autoId = React.useId();
	const inputId = id ?? autoId;
	const labelId = `${inputId}-label`;
	const hintId = `${inputId}-hint`;

	const fieldRef = React.useRef<HTMLDivElement>(null);

	const s = inputVariants({ status });
	const c = comboboxVariants();

	return (
		<BaseCombobox.Root
			items={items}
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			itemToStringLabel={(item: ComboboxOption) => item.label}
			isItemEqualToValue={(a: ComboboxOption, b: ComboboxOption) =>
				a.value === b.value
			}
			disabled={disabled}
			name={name}
		>
			<div className={s.root({ class: className })}>
				{label && (
					<label id={labelId} htmlFor={inputId} className={s.label()}>
						{label}
					</label>
				)}

				<div ref={fieldRef} className={s.textfield()}>
					{LeadingIcon && (
						<span aria-hidden className={s.leading()}>
							<LeadingIcon />
						</span>
					)}

					<BaseCombobox.Input
						id={inputId}
						placeholder={placeholder}
						className={s.input()}
						aria-invalid={status === "error" || undefined}
						aria-describedby={help ? hintId : undefined}
					/>
					<BaseCombobox.Trigger
						aria-label="Show options"
						className={s.trailing({ class: c.trigger() })}
					>
						<ChevronDown />
					</BaseCombobox.Trigger>
				</div>

				<p
					id={hintId}
					className={s.hint()}
					role={status === "error" ? "alert" : undefined}
					aria-live="polite"
				>
					{help}
				</p>
			</div>

			<BaseCombobox.Portal>
				<BaseCombobox.Positioner
					anchor={fieldRef}
					sideOffset={4}
					className={c.positioner()}
				>
					<BaseCombobox.Popup className={c.popup()}>
						<BaseCombobox.Empty className={c.empty()}>
							{emptyMessage}
						</BaseCombobox.Empty>
						<BaseCombobox.List aria-labelledby={label ? labelId : undefined}>
							{(item: ComboboxOption) => (
								<BaseCombobox.Item
									key={item.value}
									value={item}
									disabled={item.disabled}
									className={c.item()}
								>
									{item.label}
									<BaseCombobox.ItemIndicator className={c.indicator()}>
										<Check />
									</BaseCombobox.ItemIndicator>
								</BaseCombobox.Item>
							)}
						</BaseCombobox.List>
					</BaseCombobox.Popup>
				</BaseCombobox.Positioner>
			</BaseCombobox.Portal>
		</BaseCombobox.Root>
	);
}
