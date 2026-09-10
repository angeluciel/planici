"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import { useRegisterDraft } from "@/hooks/use-register-draft";
import { requestEmailCode } from "@/lib/api/email-verification";
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { maskEmail } from "@/lib/mask";
import {
	nextStep,
	previousStep,
	resolveStep,
	STEP_META,
	stampStep,
	stepperPosition,
	stepperSteps,
} from "@/lib/register-flow";
import type { RegisterData, RegisterStep } from "@/types/register";
import { AccountStep, PasswordStep, ProfileStep, TermsStep } from "./steps";
import { VerifyEmailStep } from "./verify-email-step";

const STEP_COMPONENTS = {
	account: AccountStep,
	password: PasswordStep,
	terms: TermsStep,
	profile: ProfileStep,
} as const;

export default function RegisterFlow() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const t = useTranslations("auth.register");
	const fieldError = useFieldError();

	const { data: formData, update, clear, restored } = useRegisterDraft();

	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [sendingCode, setSendingCode] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);
	const previousSlug = useRef<RegisterStep | null>(null);

	const currentSlug = resolveStep(formData, searchParams.get("step"));
	const translationKey = STEP_META[currentSlug].translationKey;
	const isFirst = previousStep(formData, currentSlug) === null;
	const isLast = nextStep(formData, currentSlug) === null;

	useEffect(() => {
		if (!restored) return;
		if (searchParams.get("step") !== currentSlug) {
			router.replace(`?step=${currentSlug}`);
		}
	}, [restored, searchParams, currentSlug, router]);

	useEffect(() => {
		if (previousSlug.current !== null && previousSlug.current !== currentSlug) {
			headingRef.current?.focus();
		}
		previousSlug.current = currentSlug;
	}, [currentSlug]);

	const sendCode = useCallback(
		async (email: string) => {
			setSendingCode(true);
			setSendError(null);

			try {
				const result = await requestEmailCode(email);

				if (!result.ok) {
					setSendError(result.error);
					return;
				}

				update({ codeRequestedAt: new Date().toISOString() });
			} catch {
				setSendError("unexpected");
			} finally {
				setSendingCode(false);
			}
		},
		[update],
	);

	useEffect(() => {
		if (!restored) return;
		if (currentSlug !== "verify") return;
		if (formData.codeRequestedAt) return;

		void sendCode(formData.email);
	}, [
		restored,
		currentSlug,
		formData.codeRequestedAt,
		formData.email,
		sendCode,
	]);

	const steps = stepperSteps(formData).map((slug) => ({
		name: t(`steps.${STEP_META[slug].translationKey}.stepper`),
	}));

	async function submit(data: RegisterData) {
		setSubmitting(true);
		setSubmitError(null);

		try {
			const result = await registerUser(data);

			if (!result.ok) {
				setSubmitError(result.error);
				return;
			}

			clear();
		} catch {
			setSubmitError("unexpected");
		} finally {
			setSubmitting(false);
		}
	}

	function advance(data: RegisterData, from: RegisterStep) {
		const next = nextStep(data, from);

		if (next === null) {
			void submit(data);
			return;
		}

		router.push(`?step=${next}`);
	}

	function handleNext(values: Partial<RegisterData>) {
		advance(update(stampStep(currentSlug, formData, values)), currentSlug);
	}

	function handleBack() {
		const previous = previousStep(formData, currentSlug);
		if (previous === null) return;

		setSubmitError(null);
		router.push(`?step=${previous}`);
	}

	function handleSkipVerification() {
		advance(update({ skippedEmailVerification: true }), "verify");
	}

	const stepProps = {
		defaultValues: formData,
		onNext: handleNext,
		onBack: handleBack,
		isFirst,
		isLast,
		isSubmitting: submitting,
	};

	const StepComponent =
		currentSlug === "verify" ? null : STEP_COMPONENTS[currentSlug];

	return (
		<div className="flex flex-col gap-8 justify-center items-center max-w-lg">
			<div className="flex flex-col gap-12 items-center">
				<div className="flex flex-col gap-12 items-center">
					<Logo className="h-8 w-auto" />

					<RegisterStepper
						currentStep={stepperPosition(formData, currentSlug)}
						steps={steps}
					/>
				</div>
				<div className="flex flex-col gap-1 items-center">
					<h1 ref={headingRef} tabIndex={-1} className="font-heading-lg">
						{t(`steps.${translationKey}.title`)}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t(`steps.${translationKey}.subtitle`, {
							email: maskEmail(formData.email),
						})}
					</span>
				</div>
			</div>

			{submitError && <Alert>{fieldError(submitError)}</Alert>}

			{StepComponent ? (
				<StepComponent {...stepProps} />
			) : (
				<VerifyEmailStep
					{...stepProps}
					onResend={() => void sendCode(formData.email)}
					onSkip={handleSkipVerification}
					isSending={sendingCode}
					sendError={sendError}
				/>
			)}
		</div>
	);
}
