"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AccountStepSchema,
	PasswordStepSchema,
	ProfileStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import { Eye, EyeClosed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
	type FieldPath,
	type FieldValues,
	type FormState,
	type UseFormGetFieldState,
	useForm,
} from "react-hook-form";
import type z from "zod";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { type FieldStatus, Input } from "@/components/input";
import { PasswordCriteria } from "@/components/password-criteria";
import { Link } from "@/i18n/navigation";
import { GOOGLE_CLIENT_ID, type GoogleIdTokenResult } from "@/lib/api/google";
import { checkAvailability } from "@/lib/api/register";
import { useFieldError } from "@/lib/form";
import { googleProfile } from "@/lib/google-profile";
import { applyGoogleProfile } from "@/lib/register-flow";
import type { StepProps } from "@/types/register";
import { GoogleRegisterButton } from "./google-register-button";

function BackButton({
	label,
	onBack,
	disabled,
}: Readonly<{ label: string; onBack: () => void; disabled?: boolean }>) {
	return (
		<Button
			text={label}
			variant="secondary"
			type="button"
			onPress={onBack}
			disabled={disabled}
		/>
	);
}

function getFieldStatus<T extends FieldValues>(
	name: FieldPath<T>,
	getFieldState: UseFormGetFieldState<T>,
	formState: FormState<T>,
): FieldStatus {
	const { error, isDirty, invalid } = getFieldState(name, formState);

	if (error) return "error";
	if (isDirty && !invalid) return "success";
	return "default";
}

function AccountStep({
	defaultValues,
	onNext,
	serverError,
}: Readonly<StepProps>) {
	const t = useTranslations();
	const fieldError = useFieldError();
	const [failure, setFailure] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);
	const busy = useRef(false);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const {
		getFieldState,
		formState,
		register,
		handleSubmit,
		setError,
		setValue,
	} = useForm({
		resolver: zodResolver(AccountStepSchema),
		defaultValues: { email: defaultValues.email ?? "" },
		mode: "onBlur",
	});

	useEffect(() => {
		if (
			serverError?.field === "email" ||
			serverError?.error === "email.taken"
		) {
			setError(
				"email",
				{ type: "server", message: serverError.error },
				{ shouldFocus: true },
			);
		}
	}, [serverError, setError]);
	const { errors } = formState;
	const status = getFieldStatus("email", getFieldState, formState);

	async function available(email: string) {
		const result = await checkAvailability({ email });
		if (!mounted.current) return false;
		if (!result.ok) {
			setFailure(result.error);
			return false;
		}
		if (!result.available) {
			setError(
				"email",
				{ type: "server", message: "email.taken" },
				{ shouldFocus: true },
			);
			return false;
		}
		return true;
	}

	async function continueEmail(values: { email: string }) {
		if (busy.current) return;
		busy.current = true;
		setChecking(true);
		setFailure(null);
		try {
			if (await available(values.email))
				onNext({ email: values.email, provider: "email" });
		} finally {
			busy.current = false;
			if (mounted.current) setChecking(false);
		}
	}

	async function continueGoogle(result: GoogleIdTokenResult) {
		if (busy.current) return;
		if (!result.ok) {
			setFailure(result.error);
			return;
		}
		const profile = googleProfile(result.idToken, GOOGLE_CLIENT_ID);
		if (!profile) {
			setFailure("google.invalid");
			return;
		}
		busy.current = true;
		setChecking(true);
		setFailure(null);
		setValue("email", profile.email);
		try {
			if (await available(profile.email)) onNext(applyGoogleProfile(profile));
		} finally {
			busy.current = false;
			if (mounted.current) setChecking(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit(continueEmail)}
			className="flex flex-col gap-4 items-center w-full"
			aria-busy={checking}
		>
			<GoogleRegisterButton
				onCredential={(result) => void continueGoogle(result)}
				disabled={checking}
			/>
			{failure && <Alert>{fieldError(failure)}</Alert>}
			<div className="flex gap-2 items-center text-text-bold w-full">
				<div className="h-px w-full bg-background-accent-gray-subtle" />
				{t("auth.register.steps.first.divider")}
				<div className="h-px w-full bg-background-accent-gray-subtle" />
			</div>
			<Input
				label={t("common.inputs.email.label")}
				type="email"
				autoComplete="email"
				placeholder={t("common.inputs.email.placeholder")}
				{...register("email")}
				status={status}
				help={fieldError(errors.email?.message)}
				disabled={checking}
			/>
			<div className="flex flex-col gap-8 items-center w-full">
				<Button
					text={
						checking
							? t("auth.register.checking")
							: t("auth.register.steps.first.next-btn")
					}
					variant="primary"
					type="submit"
					disabled={checking}
				/>
				<span className="text-sm">
					{t("auth.register.steps.first.link")}{" "}
					<Link className={`link-colors`} href={"/login"}>
						{t("auth.register.steps.first.sign-in")}
					</Link>
					.
				</span>
			</div>
		</form>
	);
}

function PasswordStep({ defaultValues, onNext, onBack }: Readonly<StepProps>) {
	const t = useTranslations();
	const fieldError = useFieldError();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	type FormValues = z.infer<typeof PasswordStepSchema>;

	const { getFieldState, formState, register, handleSubmit, watch } = useForm({
		resolver: zodResolver(PasswordStepSchema),
		defaultValues: {
			password: defaultValues.password,
			confirmPassword: defaultValues.confirmPassword,
		},
		mode: "onBlur",
	});

	const { errors } = formState;

	const statusOf = (name: FieldPath<FormValues>) =>
		getFieldStatus<FormValues>(name, getFieldState, formState);

	const passwordStatus = statusOf("password");
	const confirmStatus = statusOf("confirmPassword");

	return (
		<form
			onSubmit={handleSubmit(onNext)}
			className="flex flex-col gap-4 items-center w-full"
		>
			<div className="flex w-full flex-col">
				<Input
					label={t("common.inputs.password.label")}
					type={showPassword ? "text" : "password"}
					autoComplete="new-password"
					placeholder={t("common.inputs.password.placeholder")}
					{...register("password")}
					status={passwordStatus}
					trailingIcon={showPassword ? EyeClosed : Eye}
					trailingIconLabel={
						showPassword
							? t("auth.register.steps.second.hide-password")
							: t("auth.register.steps.second.show-password")
					}
					onTrailingIconClick={() => setShowPassword((visible) => !visible)}
				/>
				<PasswordCriteria
					value={watch("password") ?? ""}
					className="relative -top-4"
				/>
			</div>
			<Input
				label={t("auth.register.steps.second.confirm-input.label")}
				type={showConfirm ? "text" : "password"}
				autoComplete="new-password"
				placeholder={t("auth.register.steps.second.confirm-input.placeholder")}
				{...register("confirmPassword")}
				status={confirmStatus}
				help={
					fieldError(errors.confirmPassword?.message) ??
					t("auth.register.steps.second.confirm-input.help")
				}
				trailingIcon={showConfirm ? EyeClosed : Eye}
				trailingIconLabel={
					showConfirm
						? t("auth.register.steps.second.hide-password")
						: t("auth.register.steps.second.show-password")
				}
				onTrailingIconClick={() => setShowConfirm((visible) => !visible)}
			/>
			<div className="flex w-full flex-col gap-2">
				<Button
					text={t("auth.register.steps.second.next-btn")}
					variant="primary"
					type="submit"
				/>
				<BackButton
					label={t("auth.register.steps.second.back-btn")}
					onBack={onBack}
				/>
			</div>
		</form>
	);
}

function TermsStep({ defaultValues, onNext, onBack }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.third");
	const fieldError = useFieldError();

	const { formState, register, handleSubmit } = useForm({
		resolver: zodResolver(TermsStepSchema),
		defaultValues: {
			acceptedTerms: defaultValues.acceptedTerms as true,
			marketingOptIn: defaultValues.marketingOptIn,
		},
	});

	const { errors } = formState;

	return (
		<form
			onSubmit={handleSubmit(onNext)}
			className="flex flex-col justify-center items-center gap-8 w-full"
		>
			<div className="flex w-full flex-col gap-4">
				<Checkbox
					{...register("acceptedTerms")}
					status={errors.acceptedTerms ? "error" : "default"}
					help={fieldError(errors.acceptedTerms?.message)}
					label={t.rich("accept-label", {
						terms: (chunks) => (
							<Link href="/terms" className={`link-colors`}>
								{chunks}
							</Link>
						),
						privacy: (chunks) => (
							<Link href="/privacy" className={`link-colors`}>
								{chunks}
							</Link>
						),
					})}
				/>

				<Checkbox
					{...register("marketingOptIn")}
					label={t("marketing-label")}
					help={t("marketing-help")}
				/>
			</div>

			<div className="flex w-full flex-col gap-2">
				<Button text={t("next-btn")} variant="primary" type="submit" />
				<BackButton label={t("back-btn")} onBack={onBack} />
			</div>
		</form>
	);
}

function ProfileStep({
	defaultValues,
	onNext,
	onBack,
	isSubmitting,
	serverError,
}: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.fourth");
	const fieldError = useFieldError();

	type FormValues = z.infer<typeof ProfileStepSchema>;

	const { getFieldState, formState, register, handleSubmit, setError } =
		useForm({
			resolver: zodResolver(ProfileStepSchema),
			defaultValues: {
				name: defaultValues.name,
				surname: defaultValues.surname,
				slug: defaultValues.slug,
			},
			mode: "onBlur",
		});

	useEffect(() => {
		const field =
			serverError?.field ??
			(serverError?.error === "slug.taken" ? "slug" : undefined);

		if (
			serverError &&
			(field === "name" || field === "surname" || field === "slug")
		) {
			setError(
				field,
				{ type: "server", message: serverError.error },
				{ shouldFocus: true },
			);
		}
	}, [serverError, setError]);

	const { errors } = formState;

	const statusOf = (name: FieldPath<FormValues>) =>
		getFieldStatus<FormValues>(name, getFieldState, formState);

	return (
		<form
			className="flex flex-col gap-5 items-center w-full"
			onSubmit={handleSubmit(onNext)}
		>
			<Input
				label={t("name-input.title")}
				disabled={isSubmitting}
				autoComplete="given-name"
				help={fieldError(errors.name?.message) ?? t("name-input.hint")}
				placeholder={t("name-input.placeholder")}
				status={statusOf("name")}
				{...register("name")}
			/>
			<Input
				label={t("surname-input.title")}
				disabled={isSubmitting}
				autoComplete="family-name"
				help={fieldError(errors.surname?.message) ?? t("surname-input.hint")}
				placeholder={t("surname-input.placeholder")}
				status={statusOf("surname")}
				{...register("surname")}
			/>
			<Input
				label={t("nick-input.title")}
				disabled={isSubmitting}
				autoComplete="nickname"
				placeholder={t("nick-input.placeholder")}
				help={fieldError(errors.slug?.message) ?? t("nick-input.hint")}
				status={statusOf("slug")}
				{...register("slug")}
			/>
			<div className="flex w-full flex-col gap-1">
				<Button
					text={isSubmitting ? t("submitting") : t("next-btn")}
					type="submit"
					variant="primary"
					disabled={isSubmitting}
				/>
				<BackButton
					label={t("back-btn")}
					onBack={onBack}
					disabled={isSubmitting}
				/>
			</div>
		</form>
	);
}

export { AccountStep, PasswordStep, ProfileStep, TermsStep };
