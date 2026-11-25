"use client";

import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NewServiceMenu } from "./new-service-menu";

// The narrow floating "+" (SPEC-0005 R14, §9 Q19, Q24): the fill-in page of the
// active chip's template when that template is active, else the [Novo] menu.
export function ServiceFab({
	templateId,
}: Readonly<{ templateId: string | null }>) {
	const t = useTranslations("services");
	const { tenant } = useParams<{ tenant: string }>();

	if (!templateId) return <NewServiceMenu appearance="floating" />;

	return (
		<Link
			href={`/orgs/${tenant}/services/new?form=${templateId}`}
			aria-label={t("new.floating")}
			className="fixed right-4 bottom-4 z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-background-brand-bold text-text-inverse shadow-overlay hover:bg-background-brand-bold-hovered focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
		>
			<PlusIcon aria-hidden="true" className="size-6" />
		</Link>
	);
}
