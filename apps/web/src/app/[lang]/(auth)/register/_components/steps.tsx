"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AccountStepSchema,
	PasswordStepSchema,
	ProfileStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import { Eye, EyeClosed } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import type z from "zod";
import { Button } from "@/components/button";
import { type FieldStatus, Input } from "@/components/input";
import type { StepProps } from "@/types/register";

function AccountStep({ defaultValues, onNext }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.first");

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
				help={errors.email?.message}
			/>
			<div className="flex flex-col gap-8 items-center w-full">
				<Button text={t("next-btn")} variant="primary" type="submit" />
				<span className="text-sm">
					{t("link")}{" "}
					<Link
						className="text-text-link hover:text-text-link-pressed visited:text-text-link-visited hover:visited:text-text-link-visited-pressed"
						href={"/login"}
					>
						{t("sign-in")}
					</Link>
					.
				</span>
			</div>
		</form>
	);
}

function PasswordStep({ defaultValues, onNext }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.second");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(PasswordStepSchema),
		defaultValues: defaultValues,
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
			<Input
				label={t("input.label")}
				type={showPassword ? "text" : "password"}
				placeholder={t("input.placeholder")}
				{...register("password")}
				help={errors.password?.message ?? t("input.help")}
				status={passwordStatus}
				trailingIcon={showPassword ? EyeClosed : Eye}
				trailingIconLabel={
					showPassword ? t("hide-password") : t("show-password")
				}
				onTrailingIconClick={() => setShowPassword((visible) => !visible)}
			/>
			<Input
				label={t("confirm-input.label")}
				type={showConfirm ? "text" : "password"}
				placeholder={t("confirm-input.placeholder")}
				{...register("confirmPassword")}
				status={confirmStatus}
				help={errors.confirmPassword?.message ?? t("confirm-input.help")}
				trailingIcon={showConfirm ? EyeClosed : Eye}
				trailingIconLabel={
					showConfirm ? t("hide-password") : t("show-password")
				}
				onTrailingIconClick={() => setShowConfirm((visible) => !visible)}
			/>
			<Button text={t("next-btn")} variant="primary" type="submit" />
		</form>
	);
}

function TermsStep({ onNext }: Readonly<StepProps>) {
	const t = useTranslations("auth.register.steps.third");
	const { handleSubmit } = useForm({
		resolver: zodResolver(TermsStepSchema),
		defaultValues: { acceptedTerms: true as const },
	});

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
	return <div></div>;
}

export { AccountStep, PasswordStep, TermsStep, ProfileStep };
