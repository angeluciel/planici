"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { FormTemplateSummary } from "@planici/schemas";
import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useRouter } from "@/i18n/navigation";
import { listForms } from "@/lib/api/forms";

// [Novo] (SPEC-0004 §4.2): "Criar novo modelo", a divider, then every active
// client template in the order the API returns them.
export function NewClientMenu() {
	const t = useTranslations("clients");
	const router = useRouter();
	const { tenant } = useParams<{ tenant: string }>();
	const [templates, setTemplates] = useState<FormTemplateSummary[] | null>(
		null,
	);

	useEffect(() => {
		let live = true;
		void listForms({ type: "client" }).then((result) => {
			if (!live || !result.ok) return;
			setTemplates(
				result.forms.filter(
					(form) => form.type === "client" && form.status === "active",
				),
			);
		});
		return () => {
			live = false;
		};
	}, []);

	return (
		<Menu
			label={t("new.button")}
			trigger={<PlusIcon aria-hidden="true" className="size-4" />}
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
