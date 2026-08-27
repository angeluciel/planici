"use client";

<<<<<<< HEAD
<<<<<<< HEAD
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
=======
import {
	AccountStepSchema,
	PasswordStepSchema,
	TermsStepSchema,
} from "@planici/schemas";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
>>>>>>> dba2e9f (todo: register steps)
=======
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
>>>>>>> 1fd900a (otp implemented)
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import { useRegisterDraft } from "@/hooks/use-register-draft";
<<<<<<< HEAD
<<<<<<< HEAD
import { requestEmailCode } from "@/lib/api/email-verification";
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { maskEmail } from "@/lib/mask";
=======
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { TERMS_VERSION } from "@/lib/legal";
>>>>>>> dba2e9f (todo: register steps)
=======
import { requestEmailCode } from "@/lib/api/email-verification";
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { maskEmail } from "@/lib/mask";
>>>>>>> 1fd900a (otp implemented)
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
<<<<<<< HEAD

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
=======

	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [sendingCode, setSendingCode] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);
	const previousSlug = useRef<RegisterStep | null>(null);

<<<<<<< HEAD
	const previousIndex = useRef<number | null>(null);

	const requestedIndex = REGISTER_STEPS.indexOf(
		searchParams.get("step") as RegisterStep,
	);

	const currentIndex =
		requestedIndex === -1
			? 0
			: Math.min(requestedIndex, firstIncompleteStep(formData));
	const currentSlug = REGISTER_STEPS[currentIndex];
	const isFirst = currentIndex === 0;
	const isLast = currentIndex === REGISTER_STEPS.length - 1;
>>>>>>> dba2e9f (todo: register steps)
=======
	const currentSlug = resolveStep(formData, searchParams.get("step"));
	const translationKey = STEP_META[currentSlug].translationKey;
	const isFirst = previousStep(formData, currentSlug) === null;
	const isLast = nextStep(formData, currentSlug) === null;
>>>>>>> 1fd900a (otp implemented)

	useEffect(() => {
		if (!restored) return;
		if (searchParams.get("step") !== currentSlug) {
			router.replace(`?step=${currentSlug}`);
		}
	}, [restored, searchParams, currentSlug, router]);
<<<<<<< HEAD
=======

	useEffect(() => {
		if (previousSlug.current !== null && previousSlug.current !== currentSlug) {
			headingRef.current?.focus();
		}
<<<<<<< HEAD
		previousIndex.current = currentIndex;
	}, [currentIndex]);
>>>>>>> dba2e9f (todo: register steps)

	useEffect(() => {
		if (previousSlug.current !== null && previousSlug.current !== currentSlug) {
			headingRef.current?.focus();
		}
		previousSlug.current = currentSlug;
	}, [currentSlug]);

=======
		previousSlug.current = currentSlug;
	}, [currentSlug]);

>>>>>>> 1fd900a (otp implemented)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
			//setCreatedEmail(data.email);
>>>>>>> dba2e9f (todo: register steps)
=======
>>>>>>> 1fd900a (otp implemented)
		} catch {
			setSubmitError("unexpected");
		} finally {
			setSubmitting(false);
		}
	}

<<<<<<< HEAD
<<<<<<< HEAD
	function advance(data: RegisterData, from: RegisterStep) {
		const next = nextStep(data, from);

		if (next === null) {
			void submit(data);
=======
	function handleNext(values: Partial<RegisterData>) {
		const stamped =
			currentSlug === "terms"
				? {
						...values,
						termsVersion: TERMS_VERSION,
						acceptedTermsAt: new Date().toISOString(),
					}
				: values;

		const nextData = update(stamped);
		if (isLast) {
			void submit(nextData);
>>>>>>> dba2e9f (todo: register steps)
=======
	function advance(data: RegisterData, from: RegisterStep) {
		const next = nextStep(data, from);

		if (next === null) {
			void submit(data);
>>>>>>> 1fd900a (otp implemented)
			return;
		}

		router.push(`?step=${next}`);
	}

	function handleNext(values: Partial<RegisterData>) {
		advance(update(stampStep(currentSlug, formData, values)), currentSlug);
	}

	function handleBack() {
<<<<<<< HEAD
<<<<<<< HEAD
		const previous = previousStep(formData, currentSlug);
		if (previous === null) return;

		setSubmitError(null);
		router.push(`?step=${previous}`);
=======
		if (isFirst) return;
		setSubmitError(null);
		router.push(`?step=${REGISTER_STEPS[currentIndex - 1]}`);
>>>>>>> dba2e9f (todo: register steps)
=======
		const previous = previousStep(formData, currentSlug);
		if (previous === null) return;

		setSubmitError(null);
		router.push(`?step=${previous}`);
>>>>>>> 1fd900a (otp implemented)
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
<<<<<<< HEAD
<<<<<<< HEAD
						{t(`steps.${translationKey}.title`)}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t(`steps.${translationKey}.subtitle`, {
							email: maskEmail(formData.email),
						})}
=======
						{t(`steps.${STEP_TRANSLATION_KEYS[currentIndex]}.title`)}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t(`steps.${STEP_TRANSLATION_KEYS[currentIndex]}.subtitle`)}
>>>>>>> dba2e9f (todo: register steps)
=======
						{t(`steps.${translationKey}.title`)}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t(`steps.${translationKey}.subtitle`, {
							email: maskEmail(formData.email),
						})}
>>>>>>> 1fd900a (otp implemented)
					</span>
				</div>
			</div>

			{submitError && <Alert>{fieldError(submitError)}</Alert>}

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1fd900a (otp implemented)
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
<<<<<<< HEAD
=======
			<StepComponent
				defaultValues={formData}
				onNext={handleNext}
				onBack={handleBack}
				isFirst={isFirst}
				isLast={isLast}
				isSubmitting={submitting}
			/>
>>>>>>> dba2e9f (todo: register steps)
=======
>>>>>>> 1fd900a (otp implemented)
		</div>
	);
}
