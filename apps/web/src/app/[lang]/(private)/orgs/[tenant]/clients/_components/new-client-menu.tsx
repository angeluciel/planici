"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useRouter } from "@/i18n/navigation";
import { useClientTemplates } from "./use-client-templates";

// [Novo] (SPEC-0004 §4.2): "Criar novo modelo", a divider, then every active
// client template in the order the API returns them. `floating` is the narrow
// screens' round button (SPEC-0006 §4.6).
export function NewClientMenu({
	appearance,
}: Readonly<{ appearance: "button" | "floating" }>) {
	const t = useTranslations("clients");
	const router = useRouter();
	const { tenant } = useParams<{ tenant: string }>();
	const query = useClientTemplates();
	const templates = query.data?.filter((form) => form.status === "active");

	return (
		<Menu
			label={appearance === "floating" ? t("new.floating") : t("new.button")}
			appearance={appearance}
			trigger={
				appearance === "floating" ? (
					<PlusIcon aria-hidden="true" className="size-6" />
				) : undefined
			}
		>
			<MenuItem
				onSelect={() => router.push(`/orgs/${tenant}/forms/new?from=clients`)}
			>
				{t("new.createTemplate")}
			</MenuItem>
			{templates?.length === 0 && (
				<p className="px-3 py-2 font-body-sm text-text-secondary">
					{t("new.noTemplates")}
				</p>
			)}
			{templates && templates.length > 0 && (
				<>
					<BaseMenu.Separator className="my-1 w-full border-t border-border" />
					{templates.map((form) => (
						<MenuItem
							key={form.id}
							onSelect={() =>
								router.push(`/orgs/${tenant}/clients/new?form=${form.id}`)
							}
						>
							{form.name}
						</MenuItem>
					))}
				</>
			)}
		</Menu>
	);
}
