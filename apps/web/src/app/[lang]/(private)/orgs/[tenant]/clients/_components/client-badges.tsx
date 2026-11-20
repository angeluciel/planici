import { useTranslations } from "next-intl";

// "Inativo", then the template badge, shared by row and card (SPEC-0006 R6).
export function ClientBadges({
	inactive,
	formName,
}: Readonly<{ inactive: boolean; formName: string }>) {
	const t = useTranslations("clients");
	return (
		<span className="flex flex-wrap items-center gap-2">
			{inactive && (
				<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
					{t("list.inactiveBadge")}
				</span>
			)}
			<span className="rounded-sm border border-border px-2 font-body-xs text-text-secondary">
				{formName}
			</span>
		</span>
	);
}
