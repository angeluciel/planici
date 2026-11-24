"use client";

import type { FormTemplate } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { archiveForm, deleteForm, getForm } from "@/lib/api/forms";
import { isRecordsChanged } from "../_lib/failure";
import { SpinnerIcon } from "./spinner-icon";

export type DeleteSubject = {
	id: string;
	name: string;
	status: "active" | "archived";
	recordCount: number;
	recordsWithHistory: number;
};

type DeleteDialogProps = {
	subject: DeleteSubject;
	onCancel: () => void;
	onDeleted: () => void;
	onArchived: (form: FormTemplate) => void;
};

type Busy = "delete" | "archive" | null;

// Delete (SPEC-0001 §4.6). Which step shows depends on the record counts, and
// the counts are re-read when the server says they changed (409).
export function DeleteDialog({
	subject,
	onCancel,
	onDeleted,
	onArchived,
}: Readonly<DeleteDialogProps>) {
	const t = useTranslations("forms");
	const tCommon = useTranslations("common");
	const toast = useToast();
	const [counts, setCounts] = useState(subject);
	const [deleteAll, setDeleteAll] = useState(false);
	const [typed, setTyped] = useState("");
	const [busy, setBusy] = useState<Busy>(null);
	const [failure, setFailure] = useState<"delete" | "archive" | null>(null);
	const [changed, setChanged] = useState(false);

	const hasRecords = counts.recordCount > 0;
	const hasHistory = hasRecords && counts.recordsWithHistory > 0;
	const archived = subject.status === "archived";
	// an archived template cannot be archived again (owner, 2026-11-11)
	const step = hasHistory
		? "history"
		: hasRecords && !deleteAll
			? "choose"
			: hasRecords
				? "confirmAll"
				: "confirm";

	const title = {
		history: t("delete.recordsHaveHistory", { count: counts.recordCount }),
		choose: t("delete.withRecords", { count: counts.recordCount }),
		confirmAll: t("delete.confirmWithRecords", { count: counts.recordCount }),
		confirm: t("delete.confirm"),
	}[step];

	async function archive() {
		setBusy("archive");
		setFailure(null);
		const result = await archiveForm(subject.id);
		setBusy(null);
		if (!result.ok) {
			setFailure("archive");
			return;
		}
		toast.show(t("toast.archived"));
		onArchived(result.form);
	}

	async function remove() {
		setBusy("delete");
		setFailure(null);
		setChanged(false);
		const result = await deleteForm(subject.id, {
			...(hasRecords ? { deleteRecords: true } : {}),
			confirmName: typed.trim(),
		});

		if (result.ok) {
			setBusy(null);
			if (hasRecords) {
				toast.show(
					t("toast.deletedWithRecords", { count: counts.recordCount }),
				);
			}
			onDeleted();
			return;
		}

		if (isRecordsChanged(result)) {
			// show the step that matches the new counts
			const fresh = await getForm(subject.id);
			setBusy(null);
			if (fresh.ok) {
				setCounts({
					id: fresh.form.id,
					name: fresh.form.name,
					status: fresh.form.status,
					recordCount: fresh.form.recordCount,
					recordsWithHistory: fresh.form.recordsWithHistory,
				});
				setDeleteAll(false);
				setTyped("");
				setChanged(true);
				return;
			}
		} else {
			setBusy(null);
		}
		setFailure("delete");
	}

	const confirmStep = step === "confirm" || step === "confirmAll";
	const canDelete = typed.trim() === counts.name && busy === null;

	return (
		<Dialog
			open
			dismissible={busy === null}
			onClose={onCancel}
			title={title}
			closeLabel={tCommon("close")}
			footer={
				<>
					<Button
						variant="subtle"
						text={tCommon("cancel")}
						className="w-auto"
						disabled={busy !== null}
						onPress={onCancel}
					/>
					{step === "choose" && (
						<>
							{!archived && (
								<Button
									variant="subtle"
									text={t("delete.archiveInstead")}
									className="w-auto"
									leadingIcon={busy === "archive" ? SpinnerIcon : undefined}
									disabled={busy !== null}
									onPress={archive}
								/>
							)}
							<Button
								variant="primary"
								text={t("delete.deleteAll")}
								className="w-auto"
								disabled={busy !== null}
								onPress={() => setDeleteAll(true)}
							/>
						</>
					)}
					{step === "history" && !archived && (
						<Button
							variant="primary"
							text={t("delete.archiveOnly")}
							className="w-auto"
							leadingIcon={busy === "archive" ? SpinnerIcon : undefined}
							disabled={busy !== null}
							onPress={archive}
						/>
					)}
					{confirmStep && (
						<Button
							variant="primary"
							text={t("actions.delete")}
							className="w-auto bg-background-status-danger-bold hover:bg-background-status-danger-bold-hovered active:bg-background-status-danger-bold-pressed"
							leadingIcon={busy === "delete" ? SpinnerIcon : undefined}
							disabled={!canDelete}
							aria-busy={busy === "delete"}
							onPress={remove}
						/>
					)}
				</>
			}
		>
			{changed && <Alert tone="info">{t("delete.recordsChanged")}</Alert>}
			{confirmStep && (
				<Input
					label={t("apply.typeName")}
					value={typed}
					disabled={busy !== null}
					autoComplete="off"
					onChange={(event) => setTyped(event.target.value)}
				/>
			)}
			{busy === "delete" && (
				<output className="block font-body-sm text-text-secondary">
					{t("delete.deleting")}
				</output>
			)}
			{busy === "archive" && (
				<output className="block font-body-sm text-text-secondary">
					{t("archive.archiving")}
				</output>
			)}
			{failure === "delete" && <Alert>{t("delete.failed")}</Alert>}
			{failure === "archive" && <Alert>{t("archive.failed")}</Alert>}
		</Dialog>
	);
}
