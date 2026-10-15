import type { LucideIcon } from "lucide-react";
import React from "react";
import { tv, type VariantProps } from "tailwind-variants";

export const inputVariants = tv({
	slots: {
		root: "group flex w-full flex-col min-w-80",
		label:
			"pb-1 flex w-full justify-between items-center font-body-sm text-text-primary",
		textfield: [
			"group/field flex items-center justify-start w-full gap-2 px-2 rounded-md",
			"border-2 border-border-input cursor-text transition-colors duration-100 ease-out",
			"focus-within:border-border-focused",
		],
		leading:
			"size-sm shrink-0 text-icon-base transition-colors group-focus-within/field:text-icon-selected",
		input:
			"w-full gap-2 pr-2 py-2 items-center flex justify-start font-body-sm placeholder:text-text-disabled text-text-bold focus:outline-none bg-transparent flex-1 min-w-0",
		trailing:
			"size-sm shrink-0 text-icon-base transition-colors group-focus-within/field:text-icon-selected cursor-pointer",
		hint: "flex w-full items-center justify-between text-text-secondary font-body-sm font-medium min-h-5",
	},
	variants: {
		status: {
			default: {
				label: "",
				textfield: "",
				leading: "",
				trailing: "",
				hint: "",
			},
			error: {
				label: "text-text-status-danger",
				textfield:
					"border-border-danger focus-within:border-border-danger-subtle group/field",
				leading: "text-icon-danger group-focus-within/field:text-icon-danger",
				trailing: "text-icon-danger group-focus-within/field:text-icon-danger",
				hint: "text-text-status-danger",
			},
			success: {
				label: "text-text-status-success",
				textfield:
					"border-border-success focus-within:border-border-success-subtle group/field",
				leading:
					"text-icon-success group-focus-within/fielkd:text-icon-success",
				trailing:
					"text-icon-success group-focus-within/field:text-icon-success",
				hint: "text-text-status-success",
			},
		},
	},
	defaultVariants: { status: "default" },
});

export type FieldStatus = NonNullable<
	VariantProps<typeof inputVariants>["status"]
>;

interface InputProps
	extends Omit<React.ComponentPropsWithoutRef<"input">, "size"> {
	label?: string;
	help?: string; // Subtitle below the input
	status?: FieldStatus;
	leadingIcon?: LucideIcon;
	trailingIcon?: LucideIcon;
	onTrailingIconClick?: () => void;
	trailingIconLabel?: string;
}

export function Input({
	label,
	help,
	status = "default",
	leadingIcon: LeadingIcon,
	trailingIcon: TrailingIcon,
	onTrailingIconClick,
	trailingIconLabel,
	className,
	id,
	...props
}: Readonly<InputProps>) {
	const autoId = React.useId();
	const inputId = id ?? autoId;
	const hintId = `${inputId}-hint`;

	const s = inputVariants({ status });
	const isInteractive = Boolean(onTrailingIconClick);

	return (
		<div className={s.root({ class: className })}>
			{label && (
				<label htmlFor={inputId} className={s.label()}>
					{label}
				</label>
			)}
			<div className={s.textfield()}>
				{LeadingIcon && (
					<span aria-hidden className={s.leading()}>
						<LeadingIcon />
					</span>
				)}

				<input
					{...props}
					id={inputId}
					className={s.input()}
					aria-invalid={status === "error" || undefined}
					aria-describedby={help ? hintId : undefined}
				/>

				{TrailingIcon &&
					(isInteractive ? (
						<button
							type="button"
							onClick={onTrailingIconClick}
							aria-label={trailingIconLabel}
							disabled={props.disabled}
							className={s.trailing()}
						>
							<TrailingIcon />
						</button>
					) : (
						<span aria-hidden className={s.trailing()}>
							<TrailingIcon />
						</span>
					))}
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
	);
}
