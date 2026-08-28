import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@planici/schemas";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { useForm } from "react-hook-form";
import { CookieSettingsLink } from "@/components/consent/cookie-settings-link";
import Header from "@/components/header";
import { Input } from "@/components/input";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { useFieldError } from "@/lib/form";
import { cn } from "@/lib/utils";
import { EMPTY_LOGIN_DATA } from "@/types/login";

export default async function LoginPage() {
	const t = await getTranslations("auth.login");
	const tcommon = await getTranslations("common");
	const fieldError = useFieldError();

	const { getFieldState, formState, register, handleSubmit } = useForm({
		resolver: zodResolver(LoginSchema),
		defaultValues: { email: EMPTY_LOGIN_DATA.email ?? "" },
		mode: "onBlur",
	});
	const { errors } = formState;
	// const { error, isDirty, invalid } = getFieldState("email", formState);

	return (
		<div className="min-h-screen flex flex-1 px-4 bg-surface relative">
			<div className="flex flex-col grow justify-between items-center">
				<Header />

				<div className="flex flex-col w-full gap-8 justify-center items-center max-w-lg">
					<div className="flex flex-col w-full gap-12 items-center">
						<div className="flex flex-col gap-12 items-center">
							<Logo className="h-8 w-auto" />
						</div>
						<div className="flex flex-col items-center">
							<h1 className="font-heading-lg">{t("title")}</h1>
							<span className="font-body-md text-text-accent-gray text-center">
								{t("description")}
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-2 w-full">
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
							label={tcommon("inputs.email.label")}
							placeholder={tcommon("inputs.email.placeholder")}
							help={fieldError(errors.email?.message) ?? ""}
						/>

						<div className="flex flex-col w-full">
							<Input
								label={tcommon("inputs.password.label")}
								placeholder={tcommon("inputs.password.placeholder")}
								help={fieldError(errors.password?.message) ?? ""}
							/>
							<Link
								className={cn("ml-auto relative -mt-2 link-colors")}
								href={"/reset-password"}
							>
								{t("forgot")}
							</Link>
						</div>
					</div>

					{/* {submitError && <Alert>{fieldError(submitError)}</Alert>} */}
				</div>

				<footer className="flex flex-col-reverse w-full pb-4 items-center-safe justify-center-safe gap-2">
					<CookieSettingsLink className="font-body-caption text-text-link hover:text-text-link-pressed" />
					<span className="font-body-caption">
						{tcommon("footer", { year: new Date().getFullYear() })}
					</span>
				</footer>
			</div>

			<div
				className="hidden md:block md:w-[33dvw] h-dvh relative -right-4"
				aria-hidden
			>
				<Image
					src="/right.jpg"
					alt="barista"
					fill
					className="object-cover"
					sizes="(max-width: 768px) 100vw, 50vw"
					priority
				/>
			</div>
		</div>
	);
}
