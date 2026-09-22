import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import {
	type GoogleIdTokenResult,
	isGoogleConfigured,
	renderGoogleSignUpButton,
} from "@/lib/api/google";

export function GoogleRegisterButton({
	onCredential,
	disabled,
}: Readonly<{
	onCredential: (result: GoogleIdTokenResult) => void;
	disabled: boolean;
}>) {
	const locale = useLocale();
	const t = useTranslations();
	const container = useRef<HTMLDivElement>(null);
	const callback = useRef(onCredential);
	callback.current = onCredential;
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!isGoogleConfigured || !container.current) return;
		let disposed = false;
		let cleanup = () => {
			// whatever
		};
		void renderGoogleSignUpButton(container.current, locale, (result) => {
			if (!disposed) callback.current(result);
		})
			.then((dispose) => {
				if (disposed) dispose();
				else cleanup = dispose;
			})
			.catch(() => {
				if (!disposed) setFailed(true);
			});
		return () => {
			disposed = true;
			cleanup();
		};
	}, [locale, attempt]);

	return (
		<div className="w-full flex flex-col items-center gap-2">
			<div
				ref={container}
				inert={disabled || failed}
				aria-disabled={disabled}
			/>
			{!isGoogleConfigured && (
				<button
					type="button"
					disabled
					className="w-full h-10 rounded-md border border-border-disabled"
					title={t("validation.google.unavailable")}
				>
					{t("auth.register.steps.first.google-btn")}
				</button>
			)}
			{failed && (
				<>
					<Alert>{t("validation.google.unavailable")}</Alert>
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setFailed(false);
							setAttempt((value) => value + 1);
						}}
						className="text-text-link"
					>
						{t("auth.register.retry")}
					</button>
				</>
			)}
		</div>
	);
}
