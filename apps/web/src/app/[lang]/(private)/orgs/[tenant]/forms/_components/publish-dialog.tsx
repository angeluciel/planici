"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SpinnerIcon } from "./spinner-icon";

type PublishDialogProps = {
	nextVersion: number;
	onCancel: () => void;
	// resolves null on success (the host closes the dialog) or when the host
	// handled the failure itself; an error code keeps the dialog open
	onPublish: () => Promise<string | null>;
};

// Schema changed on a template without records (SPEC-0001 §4.4 step 3).
export function PublishDialog({
	nextVersion,
	onCancel,
	onPublish,
}: Readonly<PublishDialogProps>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	async function publish() {
		setBusy(true);
		setFailed(false);
		const error = await onPublish();
		setBusy(false);
		if (error) setFailed(true);
	}

	return (
		<Dialog
			open
			dismissible={!busy}
			onClose={onCancel}
			title={t("publish.confirm", { version: nextVersion })}
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
						text={t("actions.publish")}
						className="w-auto"
						leadingIcon={busy ? SpinnerIcon : undefined}
						disabled={busy}
						aria-busy={busy}
						onPress={publish}
					/>
				</>
			}
		>
			{busy && (
				<output className="block font-body-sm text-text-secondary">
					{t("publish.publishing")}
				</output>
			)}
			{failed && <Alert>{t("publish.failed")}</Alert>}
		</Dialog>
	);
}
