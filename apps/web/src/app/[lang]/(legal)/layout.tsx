import { getTranslations, setRequestLocale } from "next-intl/server";
import { CookieSettingsLink } from "@/components/consent/cookie-settings-link";
import Header from "@/components/header";

export default async function LegalLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ lang: string }>;
}>) {
	const { lang: locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations("common");

	return (
		<div className="min-h-screen flex flex-1 flex-col bg-surface px-4">
			<Header />

			<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 py-8">
				{children}
			</main>

			<footer className="flex w-full flex-col items-center gap-1 pb-4">
				<CookieSettingsLink className="font-body-caption text-text-link hover:text-text-link-pressed" />
				<span className="font-body-caption">
					{t("footer", { year: new Date().getFullYear() })}
				</span>
			</footer>
		</div>
	);
}
