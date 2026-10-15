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
			// TODO: Button variants:
			// Secondary, Sublte, Warning, Danger
			secondary: {
				root: "",
				leading: "",
				trailing: "",
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
				root: "",
				leading: "",
				trailing: "",
			},
			danger: {
				root: "",
				leading: "",
				trailing: "",
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
