"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
	deleteService,
	inactivateService,
	reactivateService,
} from "@/lib/api/services";
import { ServiceDeleteDialog } from "./service-delete-dialog";

export type ServiceTarget = {
	id: string;
	name: string;
	status: "active" | "inactive";
	hasHistory: boolean;
};

export type Busy = {
	id: string;
	action: "inactivate" | "reactivate" | "delete";
} | null;

// What a caller learns after an action: the service's status changed, it was
// deleted, a 409 `service.has-history` came back, or a 409
// `service.status-unchanged` did (the caller reloads its copy of the service).
export type ServiceEvent = "status" | "deleted" | "history" | "stale";

// Archive, reactivate and delete (SPEC-0005 §4.4, R7, R8), shared by the view
// page and the narrow rows. Every outcome invalidates the list and the chips'
// summary, which share the "services" key root. `dialog` is the typed-name
// dialog: render it once next to the controls.
export function useServiceActions(
	onEvent?: (event: ServiceEvent, target: ServiceTarget) => void,
) {
	const t = useTranslations("services");
	const toast = useToast();
	const queryClient = useQueryClient();
	const [busy, setBusy] = useState<Busy>(null);
	const [deleting, setDeleting] = useState<ServiceTarget | null>(null);
	const busyRef = useRef<Busy>(null);
	const latest = useRef(onEvent);
	latest.current = onEvent;

	const start = (next: NonNullable<Busy>) => {
		busyRef.current = next;
		setBusy(next);
	};
	const stop = () => {
		busyRef.current = null;
		setBusy(null);
	};
	const settle = (event: ServiceEvent, target: ServiceTarget) => {
		void queryClient.invalidateQueries({ queryKey: ["services"] });
		latest.current?.(event, target);
	};

	// the toast of a service that cannot be deleted; only an active one can be
	// archived instead (R15)
	const showHasHistory = (target: ServiceTarget) =>
		toast.show(
			t("delete.hasHistory"),
			"success",
			target.status === "active"
				? { label: t("actions.archive"), onClick: () => void archive(target) }
				: undefined,
		);

	async function changeStatus(
		target: ServiceTarget,
		action: "inactivate" | "reactivate",
	) {
		if (busyRef.current) return;
		start({ id: target.id, action });
		const result =
			action === "inactivate"
				? await inactivateService(target.id)
				: await reactivateService(target.id);
		stop();

		if (result.ok) {
			if (action === "inactivate") {
				toast.show(t("toast.archived"), "success", {
					label: t("toast.undo"),
					onClick: () => void reactivate(target),
				});
			} else {
				toast.show(t("toast.reactivated"));
			}
			settle("status", target);
		} else if (result.error === "service.status-unchanged") {
			toast.show(t("status.unchanged"));
			settle("stale", target);
		} else {
			toast.show(t(`${action}.error`), "danger");
		}
	}

	// takes effect at once, with no dialog (R8)
	async function archive(target: ServiceTarget) {
		await changeStatus(target, "inactivate");
	}

	async function reactivate(target: ServiceTarget) {
		await changeStatus(target, "reactivate");
	}

	// opens the typed-name dialog, or the reason when the service has history
	// (R7, R15): no dialog and no request
	function requestDelete(target: ServiceTarget) {
		if (busyRef.current) return;
		if (target.hasHistory) {
			showHasHistory(target);
			return;
		}
		setDeleting(target);
	}

	async function confirmDelete(typed: string) {
		const target = deleting;
		if (!target || busyRef.current) return;
		start({ id: target.id, action: "delete" });
		const result = await deleteService(target.id, { confirmName: typed });
		stop();

		if (result.ok) {
			setDeleting(null);
			toast.show(t("toast.deleted"));
			settle("deleted", target);
		} else if (result.error === "service.has-history") {
			setDeleting(null);
			showHasHistory(target);
			settle("history", target);
		} else if (result.error === "service.not-found") {
			setDeleting(null);
			toast.show(t("delete.error"), "danger");
			settle("stale", target);
		} else {
			toast.show(t("delete.error"), "danger");
		}
	}

	const dialog = deleting && (
		<ServiceDeleteDialog
			name={deleting.name}
			busy={busy?.action === "delete"}
			onConfirm={(typed) => void confirmDelete(typed)}
			onClose={() => setDeleting(null)}
		/>
	);

	return { busy, archive, reactivate, requestDelete, dialog };
}
