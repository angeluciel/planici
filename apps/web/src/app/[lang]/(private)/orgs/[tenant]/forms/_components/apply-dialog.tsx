"use client";

import type {
	FormChangePreviewResponse,
	MigrationMode,
} from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SpinnerIcon } from "./spinner-icon";

type ApplyDialogProps = {
	preview: FormChangePreviewResponse;
	// the stored name, which the professional types to confirm (R9)
	templateName: string;
	onCancel: () => void;
	// see PublishDialog: null closes (or is handled by the host)
	onApply: (migration: {
		mode: MigrationMode;
		confirmName?: string;
	}) => Promise<string | null>;
};

// Schema changed on a template with records (SPEC-0001 §4.7).
export function ApplyDialog({
	preview,
	templateName,
	onCancel,
	onApply,
}: Readonly<ApplyDialogProps>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const groupName = useId();
	const [mode, setMode] = useState<MigrationMode | null>(null);
	const [typed, setTyped] = useState("");
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const losesAnswers =
		mode === "update_all" && preview.recordsLosingAnswers > 0;
	const gainsRequired =
		mode === "update_all" && preview.recordsGainingRequiredFields > 0;
	const confirmed = !losesAnswers || typed.trim() === templateName;
	const canApply = mode !== null && confirmed && !busy;

	async function apply() {
		if (!mode || !canApply) return;
		setBusy(true);
		setFailed(false);
		const error = await onApply(
			losesAnswers ? { mode, confirmName: typed.trim() } : { mode },
		);
		setBusy(false);
		if (error) setFailed(true);
	}

	const options = [
		{
			mode: "keep",
			label: t("apply.keep"),
			description: t("apply.keepDescription", {
				count: preview.recordCount,
				next: preview.nextVersion,
			}),
		},
		{
			mode: "update_all",
			label: t("apply.updateAll"),
			description: t("apply.updateAllDescription", {
				count: preview.recordCount,
				next: preview.nextVersion,
			}),
		},
	] as const;

	return (
		<Dialog
			open
			dismissible={!busy}
			onClose={onCancel}
			title={t("apply.title")}
			description={t("apply.summary", {
				added: preview.added.length,
				removed: preview.removed.length,
				changed: preview.changed.length,
			})}
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
						text={t("actions.apply")}
						className="w-auto"
						leadingIcon={busy ? SpinnerIcon : undefined}
						disabled={!canApply}
						aria-busy={busy}
						onPress={apply}
					/>
				</>
			}
		>
			<div className="flex flex-col gap-3">
				{options.map((option) => {
					const id = `${groupName}-${option.mode}`;
					return (
						<div key={option.mode} className="flex items-start gap-3">
							<input
								id={id}
								type="radio"
								name={groupName}
								value={option.mode}
								checked={mode === option.mode}
								disabled={busy}
								aria-describedby={`${id}-description`}
								onChange={() => setMode(option.mode)}
								className="mt-1 size-4 shrink-0 accent-background-brand-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
							/>
							<div className="flex flex-col gap-0.5">
								<label
									htmlFor={id}
									className="cursor-pointer font-body-sm font-medium text-text-primary"
								>
									{option.label}
								</label>
								<p
									id={`${id}-description`}
									className="font-body-sm text-text-secondary"
								>
									{option.description}
								</p>
							</div>
						</div>
					);
				})}
			</div>

			{losesAnswers && (
				<>
					<Alert>
						{t("apply.answersDeleted", { count: preview.recordsLosingAnswers })}
					</Alert>
					<Input
						label={t("apply.typeName")}
						value={typed}
						disabled={busy}
						autoComplete="off"
						onChange={(event) => setTyped(event.target.value)}
					/>
				</>
			)}
			{gainsRequired && (
				<Alert tone="info">
					{t("apply.pendingRequired", {
						count: preview.recordsGainingRequiredFields,
					})}
				</Alert>
			)}
			{busy && (
				<output className="block font-body-sm text-text-secondary">
					{t("apply.applying")}
				</output>
			)}
			{failed && <Alert>{t("apply.failed")}</Alert>}
		</Dialog>
	);
}
