"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import { Logo } from "@/components/logo";
import { RegisterStepper } from "@/components/register-stepper";
import { useRegisterDraft } from "@/hooks/use-register-draft";
import type { ApiFailure } from "@/lib/api/client";
import { requestEmailCode } from "@/lib/api/email-verification";
import { registerUser } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { maskEmail } from "@/lib/mask";
import {
	CLEARED_PROOF,
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
	const {
		data: formData,
		update,
		getData,
		clear,
		restored,
	} = useRegisterDraft();

	const [submitting, setSubmitting] = useState(false);
	const [completed, setCompleted] = useState(false);
	const [submitError, setSubmitError] = useState<ApiFailure | null>(null);
	const [sendingFor, setSendingFor] = useState<string | null>(null);
	const [sendError, setSendError] = useState<string | null>(null);

	const submitLock = useRef(false);

	const completedRef = useRef(false);
	const pendingCodes = useRef(new Set<string>());
	const autoRequested = useRef<string | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);
	const previousSlug = useRef<RegisterStep | null>(null);

	const currentSlug = resolveStep(formData, searchParams.get("step"));
	const translationKey = STEP_META[currentSlug].translationKey;
	const isFirst = previousStep(formData, currentSlug) === null;
	const isLast = nextStep(formData, currentSlug) === null;
	const sendingCode = sendingFor === formData.email;

	const go = useCallback(
		(step: RegisterStep, replace = false) => {
			const href = `/register?step=${encodeURIComponent(step)}`;
			if (replace) router.replace(href);
			else router.push(href);
		},
		[router],
	);

	useEffect(() => {
		if (!restored || completedRef.current) return;
		if (searchParams.get("step") !== currentSlug) go(currentSlug, true);
	}, [restored, searchParams, currentSlug, go]);

	useEffect(() => {
		if (previousSlug.current !== null && previousSlug.current !== currentSlug) {
			headingRef.current?.focus();
		}
		previousSlug.current = currentSlug;
	}, [currentSlug]);

	useEffect(() => {
		setSendError(null);
	}, [formData.email]);

	const sendCode = useCallback(
		async (email: string) => {
			if (pendingCodes.current.has(email)) return;
			const current = getData();
			if (current.email !== email || current.provider !== "email") return;
			if (
				current.codeResendAt &&
				Date.parse(current.codeResendAt) > Date.now()
			) {
				return;
			}
			pendingCodes.current.add(email);
			setSendingFor(email);
			setSendError(null);

			try {
				const result = await requestEmailCode(email);

				if (getData().email !== email || getData().provider !== "email") return;
				if (!result.ok) {
					setSendError(result.error);
					if (result.retryAfter || result.error === "code.rate-limited") {
						update({
							codeResendAt: new Date(
								Date.now() + (result.retryAfter ?? 60) * 1000,
							).toISOString(),
						});
					}
					return;
				}

				update({
					codeRequestedAt: new Date().toISOString(),
					codeResendAt: new Date(Date.now() + 60_000).toISOString(),
				});
			} catch {
				setSendError("unexpected");
			} finally {
				pendingCodes.current.delete(email);
				setSendingFor((value) => (value === email ? null : value));
			}
		},
		[getData, update],
	);

	useEffect(() => {
		if (!restored || completedRef.current) return;
		if (currentSlug !== "verify") {
			autoRequested.current = null;
			return;
		}
		if (formData.codeRequestedAt || autoRequested.current === formData.email)
			return;

		autoRequested.current = formData.email;

		void sendCode(formData.email);
	}, [
		restored,
		currentSlug,
		formData.codeRequestedAt,
		formData.email,
		sendCode,
	]);

	const expiresAt =
		formData.provider === "google"
			? formData.idTokenExpiresAt
			: formData.emailVerificationExpiresAt;

	useEffect(() => {
		if (!expiresAt || completedRef.current) return;
		const deadline = Date.parse(expiresAt);
		if (!Number.isFinite(deadline)) return;
		const timer = setTimeout(
			() => {
				if (submitLock.current || completedRef.current) return;
				const google = getData().provider === "google";
				update({ ...CLEARED_PROOF, codeRequestedAt: null });
				setSubmitError({
					ok: false,
					error: google ? "google.expired" : "verification.expired",
				});
				go(google ? "account" : "verify", true);
			},
			Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
		);
		return () => clearTimeout(timer);
	}, [expiresAt, getData, update, go]);

	async function submit(data: RegisterData) {
		if (submitLock.current || completedRef.current) return;
		const reachable = resolveStep(data, "profile");
		if (reachable !== "profile") {
			go(reachable, true);
			return;
		}

		submitLock.current = true;
		setSubmitting(true);
		setSubmitError(null);

		try {
			const result = await registerUser(data);

			if (result.ok) {
				completedRef.current = true;
				setCompleted(true);
				clear();
				router.replace("/new");
				router.refresh();
				return;
			}
			setSubmitError(result);
			const proofFailed = [
				"token.invalid",
				"token.expired",
				"verification.expired",
				"google.invalid",
				"google.expired",
			].includes(result.error);

			if (proofFailed) {
				update({ ...CLEARED_PROOF, codeRequestedAt: null });
				go(data.provider === "google" ? "account" : "verify", true);
			} else if (result.error === "email.taken" || result.field === "email") {
				go("account", true);
			} else if (
				result.field === "password" ||
				result.field === "confirmPassword"
			) {
				go("password", true);
			} else if (
				result.error === "terms.required" ||
				result.field === "consent" ||
				result.field === "acceptedTerms"
			) {
				go("terms", true);
			}
		} finally {
			submitLock.current = false;
			setSubmitting(false);
		}
	}

	function handleNext(values: Partial<RegisterData>) {
		if (submitLock.current || completedRef.current) return;
		setSubmitError(null);
		const data = update(stampStep(currentSlug, getData(), values));
		const next = nextStep(data, currentSlug);
		if (next === null) void submit(data);
		else go(next);
	}

	function handleBack() {
		if (submitLock.current) return;
		const previous = previousStep(getData(), currentSlug);
		if (previous) {
			setSubmitError(null);
			go(previous);
		}
	}

	if (!restored) return <output>{t("loading")}</output>;
	if (completed) return <Alert tone="success">{t("success.title")}</Alert>;

	const steps = stepperSteps(formData).map((slug) => ({
		name: t(`steps.${STEP_META[slug].translationKey}.stepper`),
	}));
	const stepProps = {
		defaultValues: formData,
		onNext: handleNext,
		onBack: handleBack,
		isFirst,
		isLast,
		isSubmitting: submitting,
		serverError: submitError,
	};

	const StepComponent =
		currentSlug === "verify" ? null : STEP_COMPONENTS[currentSlug];

	return (
		<div
			className="flex flex-col gap-8 justify-center items-center max-w-lg w-full"
			aria-busy={submitting}
		>
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

			{submitError && <Alert>{fieldError(submitError.error)}</Alert>}

			{StepComponent ? (
				<StepComponent
					key={currentSlug + formData.provider + formData.email}
					{...stepProps}
				/>
			) : (
				<VerifyEmailStep
					key={formData.email}
					{...stepProps}
					onResend={() => void sendCode(formData.email)}
					isSending={sendingCode}
					sendError={sendError}
				/>
			)}
		</div>
	);
}
