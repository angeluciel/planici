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
				<span className="rounded-sm border border-border-danger px-2 py-1 font-body-caption text-text-status-danger-bolder">
					{t("list.inactiveBadge")}
				</span>
			)}
			<span className="rounded-sm py-1 px-2 font-body-caption bg-background-accent-green-bold text-text-inverse font-semibold">
				{formName.slice(0, 12)}
			</span>
		</span>
	);
}
