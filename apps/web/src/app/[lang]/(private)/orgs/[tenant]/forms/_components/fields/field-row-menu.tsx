"use client";

import { EllipsisIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Menu, MenuItem } from "@/components/ui/menu";

// The row's "..." menu: help text, options (select only), moves, and Remover
// (custom rows only, R3). The moves are the keyboard way to reorder (§4.4).
export function FieldRowMenu({
	isSelect,
	removable,
	canMoveUp,
	canMoveDown,
	onHelpText,
	onOptions,
	onMoveUp,
	onMoveDown,
	onRemove,
}: Readonly<{
	isSelect: boolean;
	removable: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onHelpText: () => void;
	onOptions: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onRemove: () => void;
}>) {
	const t = useTranslations("forms.fields");

	return (
		<Menu
			label={t("menu")}
			trigger={<EllipsisIcon aria-hidden="true" className="size-5" />}
		>
			<MenuItem onSelect={onHelpText}>{t("helpText")}</MenuItem>
			{isSelect && <MenuItem onSelect={onOptions}>{t("options")}</MenuItem>}
			<MenuItem onSelect={onMoveUp} disabled={!canMoveUp}>
				{t("moveUp")}
			</MenuItem>
			<MenuItem onSelect={onMoveDown} disabled={!canMoveDown}>
				{t("moveDown")}
			</MenuItem>
			{removable && <MenuItem onSelect={onRemove}>{t("remove")}</MenuItem>}
		</Menu>
	);
}
