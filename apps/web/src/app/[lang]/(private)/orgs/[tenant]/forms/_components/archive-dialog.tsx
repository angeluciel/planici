"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SpinnerIcon } from "./spinner-icon";

type ArchiveDialogProps = {
	onCancel: () => void;
	// resolves null on success (the host closes the dialog), else an error code
	onArchive: () => Promise<string | null>;
};

// Archive confirmation (SPEC-0001 §4.5).
export function ArchiveDialog({
	onCancel,
	onArchive,
}: Readonly<ArchiveDialogProps>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	async function archive() {
		setBusy(true);
		setFailed(false);
		const error = await onArchive();
		setBusy(false);
		if (error) setFailed(true);
	}

	return (
		<Dialog
			open
			dismissible={!busy}
			onClose={onCancel}
			title={t("archive.confirm")}
			closeLabel={tCommon("close")}
			footer={
				<>
					<Button
						variant="subtle"
						text={tCommon("cancel")}
						className="w-auto"
						disabled={busy}
						onPress={onCancel}
					/>
					<Button
						variant="primary"
						text={t("actions.archive")}
						className="w-auto"
						leadingIcon={busy ? SpinnerIcon : undefined}
						disabled={busy}
						aria-busy={busy}
						onPress={archive}
					/>
				</>
			}
		>
			{busy && (
				<output className="block font-body-sm text-text-secondary">
					{t("archive.archiving")}
				</output>
			)}
			{failed && <Alert>{t("archive.failed")}</Alert>}
		</Dialog>
	);
}
