"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
	deleteClient,
	inactivateClient,
	reactivateClient,
} from "@/lib/api/clients";
import type { RecordData } from "../../_components/records/record-adapter";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";

type Busy = "inactivate" | "reactivate" | "delete" | null;
type OpenDialog = "inactivate" | "delete" | null;

const DANGER =
	"w-auto bg-background-status-danger-bold hover:bg-background-status-danger-bold-hovered active:bg-background-status-danger-bold-pressed";

// Status and delete actions on a client's view page (SPEC-0004 §4.4, §4.5),
// rendered through RecordView's `actions` (G-1). `reload` re-reads the client.
export function ClientActions({
	record,
	reload,
}: Readonly<{ record: RecordData; reload: () => void }>) {
	const t = useTranslations("clients");
	const tCommon = useTranslations("common");
	const toast = useToast();
	const router = useRouter();
	const { tenant } = useParams<{ tenant: string }>();
	const [busy, setBusy] = useState<Busy>(null);
	const [dialog, setDialog] = useState<OpenDialog>(null);
	const [typed, setTyped] = useState("");

	const name = String(record.name ?? "");
	const inactive = record.status === "inactive";
	const hasHistory = record.hasHistory === true;

	function close() {
		setDialog(null);
		setTyped("");
	}

	// shared by inactivate and reactivate (§4.4)
	async function changeStatus(action: "inactivate" | "reactivate") {
		setBusy(action);
		const result =
			action === "inactivate"
				? await inactivateClient(record.id)
				: await reactivateClient(record.id);
		setBusy(null);
		close();

		if (result.ok) {
			toast.show(
				t(action === "inactivate" ? "toast.inactivated" : "toast.reactivated"),
			);
			reload();
		} else if (result.error === "client.status-unchanged") {
			toast.show(t("status.unchanged"));
			reload();
		} else {
			toast.show(t(`${action}.error`), "danger");
		}
	}

	async function remove() {
		setBusy("delete");
		const result = await deleteClient(record.id, { confirmName: typed.trim() });
		setBusy(null);

		if (result.ok) {
			toast.show(t("toast.deleted"));
			router.replace(`/orgs/${tenant}/clients`);
		} else if (result.error === "client.has-history") {
			close();
			reload();
		} else {
			toast.show(t("delete.error"), "danger");
		}
	}

	const canDelete = typed.trim() === name && busy === null;

	return (
		<>
			{inactive && (
				<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-sm text-text-accent-gray-bolder">
					{t("list.inactiveBadge")}
				</span>
			)}

			{inactive ? (
				<Button
					variant="subtle"
					text={
						busy === "reactivate"
							? t("reactivate.inProgress")
							: t("reactivate.action")
					}
					className="w-auto"
					leadingIcon={busy === "reactivate" ? SpinnerIcon : undefined}
					disabled={busy !== null}
					aria-busy={busy === "reactivate"}
					onPress={() => void changeStatus("reactivate")}
				/>
			) : (
				<Button
					variant="subtle"
					text={t("inactivate.action")}
					className="w-auto"
					disabled={busy !== null}
					onPress={() => setDialog("inactivate")}
				/>
			)}

			{hasHistory ? (
				<p className="font-body-sm text-text-secondary">
					{t("delete.hasHistory")}
				</p>
			) : (
				<Button
					variant="subtle"
					text={t("delete.action")}
					className="w-auto"
					disabled={busy !== null}
					onPress={() => setDialog("delete")}
				/>
			)}

			{dialog === "inactivate" && (
				<Dialog
					open
					dismissible={busy === null}
					onClose={close}
					title={t("inactivate.confirm", { name })}
					closeLabel={tCommon("close")}
					footer={
						<>
							<Button
								variant="subtle"
								text={tCommon("cancel")}
								className="w-auto"
								disabled={busy !== null}
								onPress={close}
							/>
							<Button
								variant="primary"
								text={
									busy === "inactivate"
										? t("inactivate.inProgress")
										: t("inactivate.confirmButton")
								}
								className="w-auto"
								leadingIcon={busy === "inactivate" ? SpinnerIcon : undefined}
								disabled={busy !== null}
								aria-busy={busy === "inactivate"}
								onPress={() => void changeStatus("inactivate")}
							/>
						</>
					}
				/>
			)}

			{dialog === "delete" && (
				<Dialog
					open
					dismissible={busy === null}
					onClose={close}
					title={t("delete.confirm", { name })}
					closeLabel={tCommon("close")}
					footer={
						<>
							<Button
								variant="subtle"
								text={tCommon("cancel")}
								className="w-auto"
								disabled={busy !== null}
								onPress={close}
							/>
							<Button
								variant="primary"
								text={
									busy === "delete"
										? t("delete.inProgress")
										: t("delete.action")
								}
								className={DANGER}
								leadingIcon={busy === "delete" ? SpinnerIcon : undefined}
								disabled={!canDelete}
								aria-busy={busy === "delete"}
								onPress={() => void remove()}
							/>
						</>
					}
				>
					<Input
						label={t("delete.confirmLabel")}
						value={typed}
						disabled={busy !== null}
						autoComplete="off"
						onChange={(event) => setTyped(event.target.value)}
					/>
				</Dialog>
			)}
		</>
	);
}
