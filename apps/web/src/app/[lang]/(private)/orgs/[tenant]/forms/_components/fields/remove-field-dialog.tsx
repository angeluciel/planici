"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// Asked only for a field with answers (§4.5 step 3); a field without answers
// is removed from the draft at once. The Apply dialog decides what happens to
// the answers.
export function RemoveFieldDialog({
	count,
	onCancel,
	onConfirm,
}: Readonly<{ count: number; onCancel: () => void; onConfirm: () => void }>) {
	const t = useTranslations("forms.fields");
	const tCommon = useTranslations("common");

	return (
		<Dialog
			open
			onClose={onCancel}
			title={t("removeConfirm")}
			description={t("removeWithAnswers", { count })}
			closeLabel={tCommon("close")}
			footer={
				<>
					<Button
						variant="subtle"
						text={t("cancel")}
						className="w-auto"
						onPress={onCancel}
					/>
					<Button
						variant="primary"
						text={t("removeConfirm")}
						className="w-auto"
						onPress={onConfirm}
					/>
				</>
			}
		/>
	);
}
