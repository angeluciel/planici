"use client";

import {
	AccountStepSchema,
	EmailValid,
	PasswordStepSchema,
	ProfileStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import { EyeIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod/mini";
import { Button } from "@/components/button";
import { type FieldStatus, Input } from "@/components/input";
import type { StepProps } from "@/types/register";

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<span className="font-body-caption text-text-status-danger">{message}</span>
	);
}

function AccountStep({ defaultValues, onNext }: StepProps) {
	const t = useTranslations("auth.register.steps.first");
	const [email, setEmail] = useState(defaultValues.email);
	const [error, setError] = useState<string>();
	const [status, setStatus] = useState<FieldStatus>("default");

	function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
		setEmail(e?.currentTarget.value);
		setStatus("default");
		setError(undefined);
	}

	function handleEmailBlur(event: React.FocusEvent<HTMLInputElement>) {
		if (event.currentTarget.value === "") {
			setStatus("default");
			return;
		}
		const result = AccountStepSchema.safeParse({
			email: event.currentTarget.value,
		});

		setStatus(result.success ? "success" : "error");

		if (!result.success) {
			setStatus("error");
			setError(z.flattenError(result.error).fieldErrors.email?.[0]);
			return;
		}
	}

	function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();

		const result = AccountStepSchema.safeParse({ e });

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
				value={email}
				onChange={handleEmailChange}
				onBlur={handleEmailBlur}
				status={status}
				help={error}
			/>
			<div className="flex flex-col gap-8 items-center w-full">
				<Button text={t("next-btn")} variant="primary" />
				<span>
					{t("link")}{" "}
					<Link className="text-text-link" href={"/login"}>
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

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const result = PasswordStepSchema.safeParse({ password });
		if (!result.success) {
			setError(result.error.issues[0]?.message);
			return;
		}
		setError(undefined);
		onNext(result.data);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 items-center w-full"
		>
			<label className={labelClass}>
				{t("input")}
				<input
					type="password"
					className={inputClass}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<FieldError message={error} />
			</label>
			<Button text={`Next`} variant="primary" />
		</form>
	);
}

function TermsStep({ defaultValues, onNext, onBack }: StepProps) {
	const t = useTranslations("auth.register.steps.third");
	const [acceptedTerms, setAcceptedTerms] = useState(
		defaultValues.acceptedTerms,
	);
	const [error, setError] = useState<string>();

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const result = TermsStepSchema.safeParse({ acceptedTerms });
		if (!result.success) {
			setError(result.error.issues[0]?.message);
			return;
		}
		setError(undefined);
		onNext(result.data);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 items-center w-full"
		>
			<label className="flex gap-2 items-start font-body-sm w-full">
				<input
					type="checkbox"
					checked={acceptedTerms}
					onChange={(e) => setAcceptedTerms(e.target.checked)}
				/>
				{t("checkbox")}
			</label>
			<FieldError message={error} />
			<button type="submit" className={primaryButtonClass}>
				{t("next-btn")}
			</button>
			<BackButton onBack={onBack} label={t("back-btn")} />
		</form>
	);
}

function ProfileStep({ defaultValues, onNext, onBack }: StepProps) {
	const t = useTranslations("auth.register.steps.fourth");
	const [name, setName] = useState(defaultValues.name);
	const [slug, setSlug] = useState(defaultValues.slug);
	const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const result = ProfileStepSchema.safeParse({ name, slug });
		if (!result.success) {
			const fieldErrors: { name?: string; slug?: string } = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0];
				if (field === "name") fieldErrors.name ??= issue.message;
				if (field === "slug") fieldErrors.slug ??= issue.message;
			}
			setErrors(fieldErrors);
			return;
		}
		setErrors({});
		onNext(result.data);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 items-center w-full"
		>
			<label className={labelClass}>
				{t("name-input")}
				<input
					className={inputClass}
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<FieldError message={errors.name} />
			</label>
			<label className={labelClass}>
				{t("slug-input")}
				<input
					className={inputClass}
					value={slug}
					onChange={(e) => setSlug(e.target.value)}
				/>
				<FieldError message={errors.slug} />
			</label>
			<button type="submit" className={primaryButtonClass}>
				{t("next-btn")}
			</button>
			<BackButton onBack={onBack} label={t("back-btn")} />
		</form>
	);
}

export { AccountStep, PasswordStep, TermsStep, ProfileStep };
