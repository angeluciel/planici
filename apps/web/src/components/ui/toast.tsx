"use client";

import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
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

	// sonner keeps its toasts in a module store: drop them with the provider
	useEffect(() => () => void toast.dismiss(), []);

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
						<AlertTriangleIcon
							aria-hidden="true"
							className="size-5 text-icon-danger"
						/>
					),
				}}
				toastOptions={{
					unstyled: true,
					closeButtonAriaLabel: t("close"),
					classNames: {
						toast:
							"flex w-full items-start gap-2 rounded-md border-2 border-border-input bg-surface-overlay px-3 py-2 shadow-overlay",
						title: "flex-1 font-body-sm text-text-primary",
						closeButton:
							"text-icon-subtle hover:bg-surface-overlay-hovered focus-visible:outline-2 focus-visible:outline-border-focused",
					},
				}}
			/>
		</>
	);
}
