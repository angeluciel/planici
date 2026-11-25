"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";

const DANGER =
	"w-auto bg-background-status-danger-bold hover:bg-background-status-danger-bold-hovered active:bg-background-status-danger-bold-pressed";

// The typed-name dialog of a permanent delete (SPEC-0005 R8); the server checks
// the name again. [Excluir] stays disabled until the typed name matches.
export function ServiceDeleteDialog({
	name,
	busy,
	onConfirm,
	onClose,
}: Readonly<{
	name: string;
	busy: boolean;
	onConfirm: (typed: string) => void;
	onClose: () => void;
}>) {
	const t = useTranslations("services");
	const tCommon = useTranslations("common");
	const [typed, setTyped] = useState("");
	const canDelete = typed.trim() === name && !busy;

	return (
		<Dialog
			open
			dismissible={!busy}
			onClose={onClose}
			title={t("delete.confirm", { name })}
			closeLabel={tCommon("close")}
			footer={
				<>
					<Button
						variant="subtle"
						text={tCommon("cancel")}
						className="w-auto"
						disabled={busy}
						onPress={onClose}
					/>
					<Button
						variant="primary"
						text={busy ? t("delete.inProgress") : t("delete.action")}
						className={DANGER}
						leadingIcon={busy ? SpinnerIcon : undefined}
						disabled={!canDelete}
						aria-busy={busy}
						onPress={() => onConfirm(typed.trim())}
					/>
				</>
			}
		>
			<Input
				label={t("delete.confirmLabel")}
				value={typed}
				disabled={busy}
				autoComplete="off"
				onChange={(event) => setTyped(event.target.value)}
			/>
		</Dialog>
	);
}
