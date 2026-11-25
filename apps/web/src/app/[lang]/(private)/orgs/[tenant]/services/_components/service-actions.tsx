"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { RecordData } from "../../_components/records/record-adapter";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";
import { type ServiceTarget, useServiceActions } from "./use-service-actions";

// Status and delete actions on a service's view page (SPEC-0005 §4.4),
// rendered through RecordView's `actions`. `reload` re-reads the service.
export function ServiceActions({
	record,
	reload,
}: Readonly<{ record: RecordData; reload: () => void }>) {
	const t = useTranslations("services");
	const router = useRouter();
	const { tenant } = useParams<{ tenant: string }>();

	const target: ServiceTarget = {
		id: record.id,
		name: String(record.name ?? ""),
		status: record.status === "inactive" ? "inactive" : "active",
		hasHistory: record.hasHistory === true,
	};
	const inactive = target.status === "inactive";

	const actions = useServiceActions((event) => {
		if (event === "deleted") router.replace(`/orgs/${tenant}/services`);
		else reload();
	});
	const busy = actions.busy !== null;

	return (
		<>
			{inactive && (
				<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-sm text-text-accent-gray-bolder">
					{t("list.inactiveBadge")}
				</span>
			)}

			{target.hasHistory ? (
				<p className="font-body-sm text-text-secondary">
					{t("delete.hasHistory")}
				</p>
			) : (
				<Button
					variant="danger"
					text={t("actions.delete")}
					className="w-auto"
					disabled={busy}
					onPress={() => actions.requestDelete(target)}
				/>
			)}

			{inactive ? (
				<Button
					variant="subtle"
					text={
						actions.busy?.action === "reactivate"
							? t("reactivate.inProgress")
							: t("actions.reactivate")
					}
					className="w-auto"
					leadingIcon={
						actions.busy?.action === "reactivate" ? SpinnerIcon : undefined
					}
					disabled={busy}
					aria-busy={actions.busy?.action === "reactivate"}
					onPress={() => void actions.reactivate(target)}
				/>
			) : (
				<Button
					variant="subtle"
					text={
						actions.busy?.action === "inactivate"
							? t("inactivate.inProgress")
							: t("actions.archive")
					}
					className="w-auto"
					leadingIcon={
						actions.busy?.action === "inactivate" ? SpinnerIcon : undefined
					}
					disabled={busy}
					aria-busy={actions.busy?.action === "inactivate"}
					onPress={() => void actions.archive(target)}
				/>
			)}

			{actions.dialog}
		</>
	);
}
