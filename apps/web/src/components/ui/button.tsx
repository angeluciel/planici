import type { LucideIcon } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

export const buttonVariants = tv({
	slots: {
		root: [
			"w-full flex gap-1.5 px-2 items-center rounded-sm transition-all duration-100 ease-out",
			"text-center font-body-sm font-medium cursor-pointer",
		],
		leading: "",
		label: "",
		trailing: "",
	},
	variants: {
		size: {
			md: {
				root: "justify-center h-9",
				label: "text-center",
			},
			lg: {
				root: "justify-between h-full min-h-12 py-2",
				label: "flex-1 text-left",
			},
		},
		variant: {
			primary: {
				root: [
					"bg-background-brand-bold hover:bg-background-brand-bold-hovered active:bg-background-brand-bold-pressed",
					"text-text-inverse",
				],
				leading: "",
				trailing: "",
			},
			secondary: {
				root: [
					"group border-[1.5px] border-border",
					"hover:border-border-bold hover:bg-surface-hovered",
					"active:border-border-focused active:bg-surface-pressed",
				],
				label:
					"text-icon group-hover:text-text-primary group-active:text-text-bold",
				leading: "text-icon-brand",
				trailing: "text-icon-brand",
			},
			subtle: {
				root: "hover:bg-surface-hovered active:bg-surface-pressed group",
				label:
					"text-text-secondary group-hover:text-text-primary group-active:text-text-bold",
				leading:
					"text-icon-subtle group-hover:text-icon group-active:text-icon",
				trailing:
					"text-icon-subtle group-hover:text-icon group-active:text-icon",
			},
			warning: {
				root: [
					"bg-background-status-warning-bold hover:bg-background-status-warning-bold-hovered active:bg-background-status-warning-bold-pressed",
				],
				label: "text-text-status-warning-inverse",
				leading: "text-icon-warning-inverse",
				trailing: "text-icon-warning-inverse",
			},
			danger: {
				root: [
					"group bg-background-status-danger-bold hover:bg-background-status-danger-bold-hovered active:bg-background-status-danger-bold-pressed",
				],
				label:
					"text-text-bold group-hover:text-text-inverse group-active:text-text-inverse",
				leading:
					"text-text-bold group-hover:text-text-inverse group-active:text-text-inverse",
				trailing:
					"text-text-bold group-hover:text-text-inverse group-active:text-text-inverse",
			},
		},
	},
});

type ButtonVariant = NonNullable<
	VariantProps<typeof buttonVariants>["variant"]
>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	leadingIcon?: LucideIcon;
	trailingIcon?: LucideIcon;
	text: string;
	variant: ButtonVariant;
	size?: ButtonSize;
	onPress?: () => void;
}

export function Button({
	leadingIcon: LeadingIcon,
	trailingIcon: TrailingIcon,
	text,
	type = "button",
	variant,
	size = "md",
	onPress,
	className,
	...props
}: Readonly<ButtonProps>) {
	const s = buttonVariants({ variant, size });
	return (
		<button
			type={type}
			onClick={onPress}
			className={s.root({ class: className })}
			{...props}
		>
			{LeadingIcon && <LeadingIcon className={s.leading()} />}
			<span className={s.label()}>{text}</span>
			{TrailingIcon && <TrailingIcon className={s.trailing()} />}
		</button>
	);
}
