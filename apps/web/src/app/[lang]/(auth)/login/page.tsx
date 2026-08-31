import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CookieSettingsLink } from "@/components/consent/cookie-settings-link";
import Header from "@/components/header";
import { Logo } from "@/components/logo";
import LoginForm from "./login-form";

export default async function LoginPage() {
	const t = await getTranslations("auth.login");
	const tcommon = await getTranslations("common");

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

					<LoginForm />
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
