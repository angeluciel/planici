"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@planici/schemas";
import { Eye, EyeClosed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import type z from "zod";
import { Button } from "@/components/button";
import { type FieldStatus, Input } from "@/components/input";
import { Link, useRouter } from "@/i18n/navigation";
import { useFieldError } from "@/lib/form";
import { cn } from "@/lib/utils";
import { EMPTY_LOGIN_DATA } from "@/types/login";

export default function LoginForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const t = useTranslations("auth.login");
	const tcommon = useTranslations("common");
	const fieldError = useFieldError();

	const router = useRouter();

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			email: EMPTY_LOGIN_DATA.email ?? "",
			password: EMPTY_LOGIN_DATA.password ?? "",
		},
		mode: "onBlur",
	});
	const { errors } = formState;

	type FormValues = z.infer<typeof LoginSchema>;

	const statusOf = (name: FieldPath<FormValues>): FieldStatus => {
		const { error, isDirty, invalid } = getFieldState(name, formState);
		if (error) return "error";
		if (isDirty && !invalid) return "success";
		return "default";
	};

	function onSuccess() {
		setIsSubmitting(true);
		try {
			router.push("/dashboard");
		} catch (err) {
			console.error(err);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit(onSuccess)}
			className="flex flex-col gap-2 w-full"
		>
			<button
				type="button"
				className="w-full px-4 h-10 gap-2 border-2 border-border font-body-sm font-medium rounded-md"
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
			<Button
				disabled={isSubmitting}
				type="submit"
				variant="primary"
				text={t("next-btn")}
			/>
		</form>
	);
}
