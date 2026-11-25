"use client";

import type { ServiceSummary } from "@planici/schemas";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDuration } from "@/lib/services/duration";
import { formatPrice } from "@/lib/services/price";
import { Initials, NAME_LINK } from "../../_components/list/list-parts";
import { ServiceBadges } from "./service-badges";

// Wide screens: full-width rows, no column headers. The whole row opens the
// service's page, and so does the name link (SPEC-0005 §4.1 step 1).
export function ServiceRows({
	rows,
	base,
	lastRef,
}: Readonly<{
	rows: ServiceSummary[];
	base: string;
	lastRef: (element: HTMLElement | null) => void;
}>) {
	const router = useRouter();
	return (
		<div className="flex flex-col w-full">
			<ul className="flex w-full flex-col gap-2">
				{rows.map((service, index) => (
					<li
						key={service.id}
						ref={index === rows.length - 1 ? lastRef : undefined}
						className="flex w-full"
					>
						<button
							type="button"
							className="flex cursor-pointer items-center gap-4 p-3 transition-colors duration-100 hover:bg-surface-raised-hovered focus:bg-surface-raised-pressed rounded-md shadow-raised flex-1 bg-surface-raised"
							onClick={() => router.push(`${base}/${service.id}`)}
						>
							<div className="flex min-w-0 flex-1 items-center gap-3 font-body-sm">
								<Initials name={service.name} />
								{/* name, then duration and price below it, quieter */}
								<div className="flex min-w-0 flex-col">
									<Link
										href={`${base}/${service.id}`}
										className={`${NAME_LINK} max-w-full self-start truncate`}
										onClick={(event) => event.stopPropagation()}
									>
										{service.name}
									</Link>
									<span className="self-start text-text-secondary">
										{formatDuration(service.durationMinutes)} ·{" "}
										{formatPrice(service.priceCents)}
									</span>
								</div>
							</div>
							<ServiceBadges
								inactive={service.status === "inactive"}
								formName={service.formName}
							/>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
