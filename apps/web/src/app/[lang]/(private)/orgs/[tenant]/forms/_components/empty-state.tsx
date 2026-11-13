import { PlusIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Shown when the current view has no templates of any type. */
export function EmptyState({ base }: Readonly<{ base: string }>) {
	const t = useTranslations("forms");

	return (
		<section className="flex flex-col items-center gap-3 rounded-lg px-6 py-12 text-center">
			<Image
				src="/illustrations/empty-forms.svg"
				alt="empty"
				width={200}
				height={200}
				unoptimized
			/>
			<h2 className="font-heading-sm text-text-bold">{t("list.emptyTitle")}</h2>
			<p className="max-w-md font-body-md text-text-secondary whitespace-pre-line">
				{t("list.emptyDescription")}
			</p>
			<div className="mt-2 flex flex-wrap justify-center gap-3">
				<Link
					href={`${base}/new`}
					className="flex gap-1 link-button link-button-primary"
				>
					<PlusIcon size={16} />
					{t("actions.newForm")}
				</Link>
			</div>
		</section>
	);
}
