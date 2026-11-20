"use client";

import { AlertTriangleIcon, BanIcon, CheckCircle2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Toaster, toast } from "sonner";

// Toasts are sonner's: polite live messages, never role="dialog".

type ToastTone = "success" | "danger";

type ToastApi = {
	show: (message: string, tone?: ToastTone) => void;
};

const API: ToastApi = {
	show: (message, tone = "success") => {
		if (tone === "danger") toast.error(message);
		else toast.success(message);
	},
};

export function useToast(): ToastApi {
	return useMemo(() => API, []);
}

export function ToastProvider({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const t = useTranslations("common");

	useEffect(() => () => void toast.dismiss(), []);

	useEffect(() => {
		if (process.env.NODE_ENV === "production") return;
		Object.assign(window, { toast });
		return () => {
			Reflect.deleteProperty(window, "toast");
		};
	}, []);

	return (
		<>
			{children}
			<Toaster
				position="bottom-right"
				closeButton
				containerAriaLabel={t("notifications")}
				duration={6000}
				icons={{
					success: (
						<CheckCircle2Icon
							aria-hidden="true"
							className="size-5 text-icon-success"
						/>
					),
					error: (
						<BanIcon aria-hidden="true" className="size-5 text-icon-danger" />
					),
					warning: (
						<AlertTriangleIcon
							aria-hidden="true"
							className="size-5 text-icon-warning-inverse"
						/>
					),
				}}
				toastOptions={{
					unstyled: true,
					closeButtonAriaLabel: t("close"),
					classNames: {
						toast:
							"relative flex w-full items-start gap-2 rounded-sm px-3 py-2 shadow-overlay",
						title: "flex-1 font-body-sm font-medium",
						closeButton:
							"hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused absolute right-4 top-3",
						success:
							"bg-background-status-success-subtler text-text-status-success-bolder",
						warning:
							"bg-background-status-warning-bold text-text-status-warning-inverse",
						error:
							"bg-background-status-danger-subtler text-text-status-danger-bolder",
					},
				}}
			/>
		</>
	);
}
