"use client";

import {
	AccountStepSchema,
	PasswordStepSchema,
	TermsStepSchema,
} from "@planici/schemas";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import { useRegisterDraft } from "@/hooks/use-register-draft";
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { TERMS_VERSION } from "@/lib/legal";
import {
	EMPTY_REGISTER_DATA,
	REGISTER_STEPS,
	type RegisterData,
	type RegisterStep,
} from "@/types/register";
import { AccountStep, PasswordStep, ProfileStep, TermsStep } from "./steps";

const STEP_COMPONENTS = {
	account: AccountStep,
	password: PasswordStep,
	terms: TermsStep,
	profile: ProfileStep,
} as const;

const STEP_TRANSLATION_KEYS = ["first", "second", "third", "fourth"] as const;

function firstIncompleteStep(data: RegisterData): number {
	if (!AccountStepSchema.safeParse(data).success) return 0;
	if (!PasswordStepSchema.safeParse(data).success) return 1;
	if (!TermsStepSchema.safeParse(data).success) return 2;
	return 3;
}

export default function RegisterFlow() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const t = useTranslations("auth.register");
	const fieldError = useFieldError();

	const { data: formData, update, clear, restored } = useRegisterDraft();

	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	// const [createdEmail, setCreatedEmail] = useState<string | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);

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

	useEffect(() => {
		if (!restored) return;
		if (searchParams.get("step") !== currentSlug) {
			router.replace(`?step=${currentSlug}`);
		}
	}, [restored, searchParams, currentSlug, router]);

	useEffect(() => {
		if (
			previousIndex.current !== null &&
			previousIndex.current !== currentIndex
		) {
			headingRef.current?.focus();
		}
		previousIndex.current = currentIndex;
	}, [currentIndex]);

	const steps = STEP_TRANSLATION_KEYS.map((key) => ({
		name: t(`steps.${key}.stepper`),
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
			//setCreatedEmail(data.email);
		} catch {
			setSubmitError("unexpected");
		} finally {
			setSubmitting(false);
		}
	}

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
			return;
		}

		router.push(`?step=${REGISTER_STEPS[currentIndex + 1]}`);
	}

	function handleBack() {
		if (isFirst) return;
		setSubmitError(null);
		router.push(`?step=${REGISTER_STEPS[currentIndex - 1]}`);
	}

	const StepComponent = STEP_COMPONENTS[currentSlug];

	return (
		<div className="flex flex-col gap-8 justify-center items-center max-w-lg">
			<div className="flex flex-col gap-12 items-center">
				<div className="flex flex-col gap-12 items-center">
					<Logo className="h-8 w-auto" />

					<RegisterStepper currentStep={currentIndex + 1} steps={steps} />
				</div>
				<div className="flex flex-col gap-1 items-center">
					<h1 ref={headingRef} tabIndex={-1} className="font-heading-lg">
						{t(`steps.${STEP_TRANSLATION_KEYS[currentIndex]}.title`)}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t(`steps.${STEP_TRANSLATION_KEYS[currentIndex]}.subtitle`)}
					</span>
				</div>
			</div>

			{submitError && <Alert>{fieldError(submitError)}</Alert>}

			<StepComponent
				defaultValues={formData}
				onNext={handleNext}
				onBack={handleBack}
				isFirst={isFirst}
				isLast={isLast}
				isSubmitting={submitting}
			/>
		</div>
	);
}
