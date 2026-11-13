import { ClipboardListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Shown when the current view has no templates of any type. */
export function EmptyState({ base }: Readonly<{ base: string }>) {
	const t = useTranslations("forms");

	return (
		<section className="flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-12 text-center">
			<ClipboardListIcon
				aria-hidden="true"
				className="size-10 text-icon-subtle"
			/>
			<h2 className="font-heading-sm text-text-bold">{t("list.emptyTitle")}</h2>
			<p className="max-w-md font-body-md text-text-secondary">
				{t("list.emptyDescription")}
			</p>
			<div className="mt-2 flex flex-wrap justify-center gap-3">
				<Link
					href={`${base}/new?type=client`}
					className="link-button link-button-primary"
				>
					{t("actions.newClient")}
				</Link>
				<Link
					href={`${base}/new?type=service`}
					className="link-button link-button-secondary"
				>
					{t("actions.newService")}
				</Link>
			</div>
		</section>
	);
}
