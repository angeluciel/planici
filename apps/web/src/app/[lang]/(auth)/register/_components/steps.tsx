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
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import type z from "zod";
import { Button } from "@/components/button";
import { PasswordCriteria } from "@/components/password-criteria"
import { type FieldStatus, Input } from "@/components/input";
import { Link } from "@/i18n/navigation";
import { signInWithGoogle } from "/lib/api/register"
import type { StepProps } from "@/types/register";
import { useFieldError } from "/lib/form";

const LINK_CLASS =
	"text-text-link hover:text-text-link-pressed visited:text-text-lnik-visited hover:visited:text-text-link-visited-pressed";

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

function AccountStep({ defaultValues, onNext }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.first");
	const fieldError = useFieldError();

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(AccountStepSchema),
		defaultValues: { email: defaultValues.email ?? "" },
		mode: "onBlur",
	});
	const { errors } = formState;
	const { error, isDirty, invalid } = getFieldState("email", formState);

	let status: FieldStatus = "default";
	if (error) {
		status = "error";
	} else if (isDirty && !invalid) {
		status = "success";
	}

	return (
		<form
			onSubmit={handleSubmit(onNext)}
			className="flex flex-col gap-4 items-center w-full"
		>
			<button
				type="button"
				onClick={() => void signInWithGoogle()}
				className="w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md"
			>
				{t("google-btn")}
			</button>
			<div className="flex gap-2 items-center text-text-bold">
				<div className="h-0.5 w-full bg-background-accent-disabled" />
				{t("divider")}
				<div className="h-0.5 w-full bg-background-accent-disabled" />
			</div>
			<Input
				label={t("input.label")}
				type="email"
				placeholder={t("input.placeholder")}
				{...register("email")}
				status={status}
				help={fieldError(errors.email?.message)}
			/>
			<div className="flex flex-col gap-8 items-center w-full">
				<Button text={t("next-btn")} variant="primary" type="submit" />
				<span className="text-sm">
					{t("link")}{" "}
					<Link className={LINK_CLASS} href={"/login"}>
						{t("sign-in")}
					</Link>
					.
				</span>
			</div>
		</form>
	);
}

function PasswordStep({ defaultValues, onNext, onBack }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.second");
	const fieldError = useFieldError();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(PasswordStepSchema),
		defaultValues: {
			password: defaultValues.password,
			confirmPassword: defaultValues.confirmPassword,
		},
		mode: "onBlur",
	});

	const { errors } = formState;

	type FormValues = z.infer<typeof PasswordStepSchema>;

	const statusOf = (name: FieldPath<FormValues>): FieldStatus => {
		const { error, isDirty, invalid } = getFieldState(name, formState);
		if (error) return "error";
		if (isDirty && !invalid) return "success";
		return "default";
	};

	const passwordStatus = statusOf("password");
	const confirmStatus = statusOf("confirmPassword");

	return (
		<form
			onSubmit={handleSubmit(onNext)}
			className="flex flex-col gap-4 items-center w-full"
		>
			<div className="flex w-full flex-col">
				<Input
					label={t("input.label")}
					type={showPassword ? "text" : "password"}
					autoComplete="new-password"
					placeholder={t("input.placeholder")}
					{...register("password")}
					status={passwordStatus}
					trailingIcon={showPassword ? EyeClosed : Eye}
					trailingIconLabel={
						showPassword ? t("hide-password") : t("show-password")
					}
					onTrailingIconClick={() => setShowPassword((visible) => !visible)}
				/>
				<PasswordCriteria value={watch("password") ?? ""} />
			</div>
			<Input
				label={t("confirm-input.label")}
				type={showConfirm ? "text" : "password"}
				autoComplete="new-password"
				placeholder={t("confirm-input.placeholder")}
				{...register("confirmPassword")}
				status={confirmStatus}
				help={
					fieldError(errors.confirmPassword?.message) ?? t("confirm-input.help")
				}
				trailingIcon={showConfirm ? EyeClosed : Eye}
				trailingIconLabel={
					showConfirm ? t("hide-password") : t("show-password")
				}
				onTrailingIconClick={() => setShowConfirm((visible) => !visible)}
			/>
			<div className="flex w-full flex-col gap-2">
				<Button text={t("next-btn")} variant="primary" type="submit" />
				<BackButton label={t("back-btn")} onBack={onBack} />
			</div>
		</form>
	);
}

function TermsStep({ defaultValues, onNext, onBack }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.third");
  const fieldError = useFieldError();

	const { formState, register handleSubmit } = useForm({
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
			className="flex flex-col justify-center items-center gap-20 w-full"
		>
			<Button text={t("next-btn")} variant="primary" type="submit" />
		</form>
	);
}

function ProfileStep({ defaultValues, onNext, onBack }: StepProps) {
	const t = useTranslations("auth.register.steps.fourth");

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(ProfileStepSchema),
		defaultValues: defaultValues,
		mode: "onBlur",
	});

	const { errors } = formState;

	type FormValues = z.infer<typeof ProfileStepSchema>;
	const statusOf = (name: FieldPath<FormValues>): FieldStatus => {
		const { error, isDirty, invalid } = getFieldState(name, formState);
		if (error) return "error";
		if (isDirty && !invalid) return "success";
		return "default";
	};

	const nameStatus = statusOf("name");
	const surnameStatus = statusOf("surname");
	const nicknameStatus = statusOf("slug");

	return (
		<form
			className="flex flex-col gap-5 items-center w-full"
			onSubmit={handleSubmit(onNext)}
		>
			<Input
				label={t("name-input.title")}
				help={errors.name?.message ?? t("name-input.hint")}
				placeholder={t("name-input.placeholder")}
				status={nameStatus}
				{...register("name")}
			/>
			<Input
				label={t("surname-input.title")}
				help={errors.surname?.message ?? t("surname-input.hint")}
				placeholder={t("surname-input.placeholder")}
				status={surnameStatus}
				{...register("surname")}
			/>
			<Input
				label={t("nick-input.title")}
				placeholder={t("nick-input.placeholder")}
				help={errors.slug?.message ?? t("nick-input.hint")}
				status={nicknameStatus}
				{...register("slug")}
			/>
			<Button text={t("next-btn")} type="submit" variant="primary" />
		</form>
	);
}

export { AccountStep, PasswordStep, ProfileStep, TermsStep };
