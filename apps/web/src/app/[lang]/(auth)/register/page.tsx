import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CookieSettingsLink } from "@/components/consent/cookie-settings-link";
import Header from "@/components/header";
import RegisterFlow from "./_components/RegisterFlow";

export default async function RegisterPage() {
	const t = await getTranslations("common");

	return (
		<div className="min-h-screen flex flex-1 px-4 bg-surface relative">
			<div className="flex flex-col grow justify-between items-center">
				<Header />

				<Suspense>
					<RegisterFlow />
				</Suspense>

				<footer className="flex w-full pb-4 items-center-safe justify-center-safe">
					<CookieSettingsLink className="font-body-caption text-text-link hover:text-text-link-pressed" />
					<span className="font-body-caption">
						{t("footer", { year: new Date().getFullYear() })}
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
