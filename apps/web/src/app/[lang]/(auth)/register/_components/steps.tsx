"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AccountStepSchema,
	EmailValid,
	PasswordStepSchema,
	ProfileStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/mini";
import { Button } from "@/components/button";
import { type FieldStatus, Input } from "@/components/input";
import type { StepProps } from "@/types/register";

function AccountStep({ defaultValues, onNext }: StepProps) {
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

function PasswordStep({ defaultValues, onNext, onBack }: StepProps) {
	const t = useTranslations("auth.register.steps.second");
	const [password, setPassword] = useState(defaultValues.password);
	const [error, setError] = useState<string>();
	const [status, setStatus] = useState<FieldStatus>("default");

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		setPassword(e?.currentTarget.value);
		setStatus("default");
		setError(undefined);
	}

	function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
		if (event.currentTarget.value === "") {
			setStatus("default");
			return;
		}
		const result = PasswordStepSchema.safeParse({
			email: event.currentTarget.value,
		});

		setStatus(result.success ? "success" : "error");

		if (!result.success) {
			setStatus("error");
			setError(z.flattenError(result.error).fieldErrors.password?.[0]);
			return;
		}
	}

	function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();

		const result = PasswordStepSchema.safeParse({ e });

		if (!result.success) {
			setStatus("error");
			setError("");
			return;
		}
		setStatus("success");
		setError(undefined);
		onNext(result.data);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 items-center w-full"
		>
			<Input
				label={t("input.label")}
				type="password"
				value={password}
				onChange={handleChange}
				onBlur={handleBlur}
				help={error ? error : t("input.help")}
				status={status}
			/>
			<Button text={`Next`} variant="primary" />
		</form>
	);
}

function TermsStep({ defaultValues, onNext, onBack }: StepProps) {
	return <div>a</div>;
}

function ProfileStep({ defaultValues, onNext, onBack }: StepProps) {
	return <div>a</div>;
}

export { AccountStep, PasswordStep, TermsStep, ProfileStep };
