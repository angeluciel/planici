"use client";

import { EMAIL_CODE_LENGTH, VerifyEmailStepSchema } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import type { FieldStatus } from "@/components/input";
import { OtpInput } from "@/components/input-otp";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { verifyEmailCode } from "@/lib/api/email-verification";
import { useFieldError } from "@/lib/form";
import type { VerifyStepProps } from "@/types/register";

const LINK_CLASS =
	"text-text-link hover:text-text-link-pressed disabled:cursor-not-allowed disabled:text-text-disabled";

function VerifyEmailStep({
	defaultValues,
	onNext,
	onBack,
	onResend,
	onSkip,
	isSending,
	sendError,
}: Readonly<VerifyStepProps>) {
	const t = useTranslations("auth.register.steps.verify");
	const fieldError = useFieldError();

	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [verifying, setVerifying] = useState(false);

	const { secondsLeft, isCoolingDown, startFrom } = useResendCooldown();

	useEffect(() => {
		startFrom(defaultValues.codeRequestedAt);
	}, [defaultValues.codeRequestedAt, startFrom]);

	async function submit(value: string) {
		const parsed = VerifyEmailStepSchema.safeParse({ code: value });

		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "code.invalid");
			return;
		}

		setVerifying(true);
		setError(null);

		try {
			const result = await verifyEmailCode(
				defaultValues.email,
				parsed.data.code,
			);

			if (!result.ok) {
				setError(result.error);
				setCode("");
				return;
			}

			onNext({ confirmedEmail: true, skippedEmailVerification: false });
		} catch {
			setError("unexpected");
		} finally {
			setVerifying(false);
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
					if (error) setError(null);
				}}
				onComplete={(next) => void submit(next)}
				length={EMAIL_CODE_LENGTH}
				groupSize={EMAIL_CODE_LENGTH / 2}
				status={status}
				disabled={verifying || isSending}
				help={fieldError(message ?? undefined)}
				label={t("code-label")}
			/>

			<div className="flex flex-col gap-1 items-center font-body-sm text-text-secondary">
				<span>
					{t("resend-question")}{" "}
					<button
						type="button"
						onClick={onResend}
						disabled={isCoolingDown || isSending || verifying}
						className={LINK_CLASS}
					>
						{isCoolingDown
							? t("resend-wait", { seconds: secondsLeft })
							: t("resend")}
					</button>
				</span>

				<span>
					{t("skip-question")}{" "}
					<button
						type="button"
						onClick={onSkip}
						disabled={verifying}
						className={LINK_CLASS}
					>
						{t("skip")}
					</button>
				</span>
			</div>

			<Button
				text={t("back-btn")}
				variant="secondary"
				type="button"
				onPress={onBack}
				disabled={verifying}
			/>
		</div>
	);
}

export { VerifyEmailStep };
