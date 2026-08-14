"use client";

import {
	AccountStepSchema,
	PasswordStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
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

	const [formData, setFormData] = useState<RegisterData>(EMPTY_REGISTER_DATA);

	const requestedIndex = REGISTER_STEPS.indexOf(
		searchParams.get("step") as RegisterStep,
	);
	// Deep links past the first incomplete step are clamped back to it, since
	// form data only lives in client state.
	const currentIndex =
		requestedIndex === -1
			? 0
			: Math.min(requestedIndex, firstIncompleteStep(formData));
	const currentSlug = REGISTER_STEPS[currentIndex];
	const isFirst = currentIndex === 0;
	const isLast = currentIndex === REGISTER_STEPS.length - 1;

	useEffect(() => {
		if (searchParams.get("step") !== currentSlug) {
			router.replace(`?step=${currentSlug}`);
		}
	}, [searchParams, currentSlug, router]);

	const steps = STEP_TRANSLATION_KEYS.map((key) => ({
		name: t(`steps.${key}.stepper`),
	}));

	function handleNext(values: Partial<RegisterData>) {
		const nextData = { ...formData, ...values };
		setFormData(nextData);

		if (isLast) {
			// TODO: call the registration API
			console.log("submit registration", nextData);
			return;
		}

		router.push(`?step=${REGISTER_STEPS[currentIndex + 1]}`);
	}

	function handleBack() {
		if (isFirst) return;
		router.push(`?step=${REGISTER_STEPS[currentIndex - 1]}`);
	}

	const StepComponent = STEP_COMPONENTS[currentSlug];

	return (
		<div className="flex flex-col gap-8 justify-center items-center">
			<div className="flex flex-col gap-12 items-center">
				<div className="flex flex-col gap-12 items-center">
					<Logo className="h-8 w-auto" />

					<RegisterStepper currentStep={currentIndex + 1} steps={steps} />
				</div>

				<h1 className="font-heading-lg">
					{t(`steps.${STEP_TRANSLATION_KEYS[currentIndex]}.title`)}
				</h1>
			</div>

			<StepComponent
				defaultValues={formData}
				onNext={handleNext}
				onBack={handleBack}
				isFirst={isFirst}
				isLast={isLast}
			/>
		</div>
	);
}
