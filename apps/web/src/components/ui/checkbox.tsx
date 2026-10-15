import { Check } from "lucide-react";
import React from "react";
import { tv, type VariantProps } from "tailwind-variants";

export const checkboxVariants = tv({
	slots: {
		root: "flex w-full flex-col gap-1",
		field: "flex w-full items-start gap-3",
		control: [
			"group/box relative grid size-5 shrink-0 place-items-center rounded-sm",
			"border-2 border-border-input transition-colors duration-100 ease-out",
			"has-focus-visible:border-border-focused has-focus-visible:outline-2",
			"has-focus-visible:outline-offset-2 has-focus-visible:outline-border-focused",
			"has-checked:border-border-brand has-checked:bg-background-brand-bold",
			"has-disabled:cursor-not-allowed has-disabled:border-border-disabled",
			"has-disabled:bg-background-accent-disabled",
		],
		input:
			"absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed",
		icon: "pointer-events-none size-3.5 text-text-inverse opacity-0 transition-opacity group-has-checked/box:opacity-100",
		label: "font-body-sm text-text-primary cursor-pointer select-none",
		hint: "pl-8 font-body-sm font-medium text-text-secondary min-h-5",
	},
	variants: {
		status: {
			default: {},
			error: {
				control: "border-border-danger",
				label: "text-text-status-danger",
				hint: "text-text-status-danger",
			},
		},
	},
	defaultVariants: { status: "default" },
});

export type CheckboxStatus = NonNullable<
	VariantProps<typeof checkboxVariants>["status"]
>;

interface CheckboxProps
	extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
	label: React.ReactNode;
	help?: string;
	status?: CheckboxStatus;
}

export function Checkbox({
	label,
	help,
	status = "default",
	className,
	id,
	...props
}: Readonly<CheckboxProps>) {
	const autoId = React.useId();
	const inputId = id ?? autoId;
	const hintId = `${inputId}-hint`;

	const s = checkboxVariants({ status });

	return (
		<div className={s.root({ class: className })}>
			<div className={s.field()}>
				<span className={s.control()}>
					<input
						{...props}
						id={inputId}
						type="checkbox"
						className={s.input()}
						aria-invalid={status === "error" || undefined}
						aria-describedby={help ? hintId : undefined}
					/>
					<Check aria-hidden className={s.icon()} strokeWidth={3} />
				</span>

				<label htmlFor={inputId} className={s.label()}>
					{label}
				</label>
			</div>

			{help && (
				<p
					id={hintId}
					className={s.hint()}
					role={status === "error" ? "alert" : undefined}
					aria-live="polite"
				>
					{help}
				</p>
			)}
		</div>
	);
}
