import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

export const alertVariants = tv({
	slots: {
		root: "flex w-full items-start gap-2 rounded-md border-2 px-3 py-2",
		icon: "size-5 shrink-0",
		message: "font-body-sm font-medium",
	},
	variants: {
		tone: {
			danger: {
				root: "border-border-danger bg-background-status-danger-subtler",
				icon: "text-icon-danger",
				message: "text-text-status-danger-bolder",
			},
			success: {
				root: "border-border-success bg-background-status-success-subtler",
				icon: "text-icon-success",
				message: "text-text-status-success-bolder",
			},
			info: {
				root: "border-border-selected bg-background-status-information-subtler",
				icon: "text-icon-information",
				message: "text-text-status-information-bolder",
			},
		},
	},
	defaultVariants: { tone: "danger" },
});

type AlertTone = NonNullable<VariantProps<typeof alertVariants>["tone"]>;

const TONE_ICONS = {
	danger: AlertTriangleIcon,
	success: CheckCircle2Icon,
	info: InfoIcon,
} as const;

interface AlertProps {
	children: React.ReactNode;
	tone?: AlertTone;
	className?: string;
}

export function Alert({
	children,
	tone = "danger",
	className,
}: Readonly<AlertProps>) {
	const s = alertVariants({ tone });
	const Icon = TONE_ICONS[tone];

	return (
		<div
			className={s.root({ class: className })}
			role={tone === "danger" ? "alert" : "status"}
		>
			<Icon aria-hidden className={s.icon()} />
			<p className={s.message()}>{children}</p>
		</div>
	);
}
