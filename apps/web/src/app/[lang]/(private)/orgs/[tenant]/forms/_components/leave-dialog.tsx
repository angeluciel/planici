"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { LeaveGuard } from "@/hooks/use-leave-guard";

// In-app leave prompt (owner, 2026-11-11): never window.confirm.
// `discardKey` is the caller's "Descartar" copy, e.g. "forms.editor.discard".
export function LeaveDialog({
	guard,
	discardKey,
}: Readonly<{ guard: LeaveGuard; discardKey: string }>) {
	const t = useTranslations();

	return (
		<Dialog
			open={guard.open}
			onClose={guard.stay}
			title={guard.message}
			closeLabel={t("common.close")}
			footer={
				<>
					<Button
						variant="subtle"
						text={t("common.cancel")}
						className="w-auto"
						onPress={guard.stay}
					/>
					<Button
						variant="primary"
						text={t(discardKey)}
						className="w-auto"
						onPress={guard.leave}
					/>
				</>
			}
		/>
	);
}
