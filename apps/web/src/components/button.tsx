import type { LucideIcon } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

export const buttonVariants = tv({
	slots: {
		root: [
			"w-full flex gap-1.5 px-2 items-center rounded-sm transition-all duration-100 ease-out",
			"text-center font-body-sm font-medium cursor-pointer",
		],
		leading: "",
		trailing: "",
	},
	variants: {
		size: {
			md: {
				root: "justify-center h-9",
			},
			lg: {
				root: "justify-between h-full min-h-12 py-2",
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
				root: "",
				leading: "",
				trailing: "",
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
			{text}
			{TrailingIcon && <TrailingIcon className={s.trailing()} />}
		</button>
	);
}
