"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EmailLoginSchema } from "@planici/schemas";
import { Eye, EyeClosed } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import type z from "zod";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { type FieldStatus, Input } from "@/components/input";
import { Link, useRouter } from "@/i18n/navigation";
import { isGoogleConfigured } from "@/lib/api/google";
import { login, signInWithGoogle } from "@/lib/api/login";
import { useFieldError } from "@/lib/form";
import { cn } from "@/lib/utils";
import { EMPTY_LOGIN_DATA } from "@/types/login";

const DEFAULT_REDIRECT = "/dashboard";

type LoginFormValues = z.infer<typeof EmailLoginSchema>;

function safeRedirect(next: string | null): string {
	if (!next) return DEFAULT_REDIRECT;
	if (!next.startsWith("/") || next.startsWith("//")) return DEFAULT_REDIRECT;
	return next;
}

export default function LoginForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const t = useTranslations("auth.login");
	const tcommon = useTranslations("common");
	const fieldError = useFieldError();

	const router = useRouter();
	const searchParams = useSearchParams();

	const { getFieldState, formState, register, handleSubmit, getValues } =
		useForm({
			resolver: zodResolver(EmailLoginSchema),
			defaultValues: {
				email: EMPTY_LOGIN_DATA.email,
				password: EMPTY_LOGIN_DATA.password,
				rememberMe: EMPTY_LOGIN_DATA.rememberMe ?? false,
			},
			mode: "onBlur",
		});
	const { errors } = formState;

	const statusOf = (name: FieldPath<LoginFormValues>): FieldStatus => {
		const { error, isDirty, invalid } = getFieldState(name, formState);
		if (error) return "error";
		if (isDirty && !invalid) return "success";
		return "default";
	};

	function onAuthenticated() {
		router.push(safeRedirect(searchParams.get("next")));
	}

	async function submit(values: LoginFormValues) {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const result = await login({ ...values });

			if (!result.ok) {
				setSubmitError(result.error);
				return;
			}

			onAuthenticated();
		} catch {
			setSubmitError("unexpected");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function onGoogleSignIn() {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const result = await signInWithGoogle(getValues("rememberMe"));

			if (!result.ok) {
				setSubmitError(result.error);
				return;
			}

			onAuthenticated();
		} catch {
			setSubmitError("unexpected");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit(submit)}
			className="flex flex-col gap-2 w-full"
		>
			{submitError && <Alert tone="danger">{fieldError(submitError)}</Alert>}
			<button
				type="button"
				onClick={() => void onGoogleSignIn()}
				disabled={!isGoogleConfigured || isSubmitting}
				title={isGoogleConfigured ? undefined : t("google-unavailable")}
				className={cn(
					"w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md",
					"disabled:cursor-not-allowed disabled:opacity-60",
				)}
			>
				{t("google-btn")}
			</button>

			<div className="flex gap-2 items-center text-text-bold w-full">
				<div className="h-px w-full bg-background-accent-gray-subtle" />
				{t("divider")}
				<div className="h-px w-full bg-background-accent-gray-subtle" />
			</div>

			<Input
				autoComplete="email"
				{...register("email")}
				label={tcommon("inputs.email.label")}
				placeholder={tcommon("inputs.email.placeholder")}
				help={fieldError(errors.email?.message) ?? ""}
				status={statusOf("email")}
			/>

			<div className="flex flex-col w-full">
				<Input
					autoComplete="current-password"
					{...register("password")}
					type={showPassword ? "text" : "password"}
					label={tcommon("inputs.password.label")}
					placeholder={tcommon("inputs.password.placeholder")}
					help={fieldError(errors.password?.message) ?? ""}
					status={statusOf("password")}
					trailingIcon={showPassword ? EyeClosed : Eye}
					trailingIconLabel={
						showPassword ? t("hide-password") : t("show-password")
					}
					onTrailingIconClick={() => setShowPassword((visible) => !visible)}
				/>
				<Link
					className={cn("ml-auto relative -mt-2 link-colors")}
					href={"/reset-password"}
				>
					{t("forgot")}
				</Link>
			</div>
			<Checkbox label="Lembrar de mim" {...register("rememberMe")} />
			<Button
				disabled={isSubmitting}
				type="submit"
				variant="primary"
				text={t("next-btn")}
			/>
		</form>
	);
}
