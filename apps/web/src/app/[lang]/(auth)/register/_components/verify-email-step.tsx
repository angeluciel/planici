"use client";

import { EMAIL_CODE_LENGTH, VerifyEmailStepSchema } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { FieldStatus } from "@/components/input";
import { OtpInput } from "@/components/input-otp";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { verifyEmailCode } from "@/lib/api/email-verification";
import { useFieldError } from "@/lib/form";
import type { VerifyStepProps } from "@/types/register";

function VerifyEmailStep({
	defaultValues,
	onNext,
	onBack,
	onResend,
	isSending,
	sendError,
}: Readonly<VerifyStepProps>) {
	const t = useTranslations("auth.register.steps.verify");
	const fieldError = useFieldError();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [verifying, setVerifying] = useState(false);
	const locked = useRef(false);
	const mounted = useRef(false);
	const { secondsLeft, isCoolingDown, startFrom, startUntil } =
		useResendCooldown();

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (defaultValues.codeResendAt) startUntil(defaultValues.codeResendAt);
		else startFrom(defaultValues.codeRequestedAt);
	}, [
		defaultValues.codeRequestedAt,
		defaultValues.codeResendAt,
		startFrom,
		startUntil,
	]);

	async function submit(value: string) {
		if (locked.current || isSending) return;
		const parsed = VerifyEmailStepSchema.safeParse({ code: value });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "code.invalid");
			return;
		}

		locked.current = true;
		setVerifying(true);
		setError(null);

		try {
			const result = await verifyEmailCode(
				defaultValues.email,
				parsed.data.code,
			);

			if (!mounted.current) return;
			if (!result.ok) {
				setError(result.error);
				setCode("");
				if (result.retryAfter)
					startUntil(
						new Date(Date.now() + result.retryAfter * 1000).toISOString(),
					);
				return;
			}

			onNext({
				confirmedEmail: true,
				verifiedEmail: defaultValues.email.trim().toLowerCase(),
				emailVerificationToken: result.emailVerificationToken,
				emailVerificationExpiresAt: new Date(
					Date.now() + result.expiresIn * 1000,
				).toISOString(),
				codeRequestedAt: null,
			});
		} catch {
			setError("unexpected");
		} finally {
			locked.current = false;
			if (mounted.current) setVerifying(false);
		}
	}

	const message = error ?? sendError;
	const status: FieldStatus = message ? "error" : "default";

	return (
		<div className="flex flex-col gap-6 items-center w-full">
			<OtpInput
				value={code}
				onChange={(next) => {
					setCode(next);
					setError(null);
				}}
				onComplete={(next) => void submit(next)}
				length={EMAIL_CODE_LENGTH}
				groupSize={EMAIL_CODE_LENGTH / 2}
				status={status}
				disabled={verifying || isSending}
				help={fieldError(message ?? undefined)}
				label={t("code-label")}
			/>
			{isSending && <output>{t("sending")}</output>}
			<div className="flex flex-col gap-1 items-center font-body-sm text-text-secondary">
				<span>
					{t("resend-question")}{" "}
					<button
						type="button"
						onClick={() => {
							setError(null);
							setCode("");
							onResend();
						}}
						disabled={isCoolingDown || isSending || verifying}
						className={`link-colors`}
					>
						{isCoolingDown
							? t("resend-wait", { seconds: secondsLeft })
							: t("resend")}
					</button>
				</span>

				<button
					type="button"
					onClick={onBack}
					disabled={verifying}
					className={`link-colors`}
				>
					{t("back-btn")}
				</button>
			</div>
		</div>
	);
}

export { VerifyEmailStep };
