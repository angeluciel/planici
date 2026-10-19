import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function TenantPage({
	params,
}: Readonly<{ params: Promise<{ tenant: string }> }>) {
	const { tenant } = await params;
	const t = await getTranslations("tenants.workspace");

	return (
		<section className="flex flex-col items-start gap-4 p-6 text-text-primary">
			<h1 className="font-heading-lg">{t("title")}</h1>
			<p className="font-body-md text-text-secondary">{t("description")}</p>
			<Link
				href={`/orgs/${tenant}/clients`}
				className="rounded-md bg-background-brand-bold px-4 py-2 font-body-sm text-text-inverse hover:bg-background-brand-bold-hovered focus-visible:outline-2 focus-visible:outline-border-focused"
			>
				{t("clients")}
			</Link>
		</section>
	);
}
