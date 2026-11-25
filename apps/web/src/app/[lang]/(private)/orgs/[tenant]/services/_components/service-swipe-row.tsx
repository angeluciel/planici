"use client";

import type { ServiceSummary } from "@planici/schemas";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SwipeRow } from "@/components/ui/swipe-row";
import { Link } from "@/i18n/navigation";
import { formatDuration } from "@/lib/services/duration";
import { formatPrice } from "@/lib/services/price";
import { NAME_LINK } from "../../_components/list/list-parts";
import type { useServiceActions } from "./use-service-actions";

// A narrow row (SPEC-0005 R14, R15): status dot, name, duration and price.
// Tapping opens the view page; swiping, "⋯" or a long press offer the actions.
export function ServiceSwipeRow({
	service,
	base,
	actions,
}: Readonly<{
	service: ServiceSummary;
	base: string;
	actions: Pick<
		ReturnType<typeof useServiceActions>,
		"archive" | "reactivate" | "requestDelete"
	>;
}>) {
	const t = useTranslations("services");
	const inactive = service.status === "inactive";
	const target = {
		id: service.id,
		name: service.name,
		status: service.status,
		hasHistory: service.hasHistory,
	};

	return (
		<SwipeRow
			menuLabel={t("actions.menu")}
			actions={[
				inactive
					? {
							label: t("actions.reactivate"),
							onSelect: () => void actions.reactivate(target),
						}
					: {
							label: t("actions.archive"),
							onSelect: () => void actions.archive(target),
						},
				{
					label: t("actions.delete"),
					icon: <Trash2Icon aria-hidden="true" className="size-4" />,
					tone: "danger",
					onSelect: () => actions.requestDelete(target),
				},
			]}
		>
			<Link
				href={`${base}/${service.id}`}
				draggable={false}
				className="flex min-w-0 items-center gap-3 rounded-sm p-3 focus-visible:outline-2 focus-visible:outline-border-focused"
			>
				<span
					aria-hidden="true"
					data-status={service.status}
					className={`size-2.5 shrink-0 rounded-full ${
						inactive
							? "bg-background-accent-gray-subtle"
							: "bg-background-status-success-bold"
					}`}
				/>
				<span className="flex min-w-0 flex-1 flex-col font-body-sm">
					<span className={`${NAME_LINK} truncate`}>{service.name}</span>
					<span className="text-text-secondary">
						{formatDuration(service.durationMinutes)}
					</span>
				</span>
				<span className="shrink-0 font-body-sm text-text-primary">
					{formatPrice(service.priceCents)}
				</span>
			</Link>
		</SwipeRow>
	);
}
