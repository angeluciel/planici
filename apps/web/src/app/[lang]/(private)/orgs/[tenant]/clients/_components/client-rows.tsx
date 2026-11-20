"use client";

import type { ClientSummary } from "@planici/schemas";
import { Link, useRouter } from "@/i18n/navigation";
import { maskPhone } from "../../_components/records/masks";
import { ClientBadges } from "./client-badges";

// first letters of the first and last words: "Ana Maria Souza" -> "AS"
export function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = [...(words[0] ?? "")][0] ?? "";
	const last = words.length > 1 ? ([...(words.at(-1) ?? "")][0] ?? "") : "";
	return (first + last).toLocaleUpperCase();
}

export function Initials({ name }: Readonly<{ name: string }>) {
	return (
		<span
			aria-hidden="true"
			className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-brand-bold font-body-xs font-semibold text-text-inverse"
		>
			{initials(name)}
		</span>
	);
}

export const NAME_LINK =
	"rounded-sm font-medium text-text-bold hover:underline focus-visible:outline-2 focus-visible:outline-border-focused";

// Wide screens: full-width rows, no column headers. The whole row opens the
// client's page, and so does the name link.
export function ClientRows({
	rows,
	base,
	lastRef,
}: Readonly<{
	rows: ClientSummary[];
	base: string;
	lastRef: (element: HTMLElement | null) => void;
}>) {
	const router = useRouter();
	return (
		<div className="flex flex-col w-full">
			<ul className="flex w-full flex-col gap-2">
				{rows.map((client, index) => (
					<li
						key={client.id}
						ref={index === rows.length - 1 ? lastRef : undefined}
						className="flex w-full"
					>
						<button
							type="button"
							className="flex cursor-pointer items-center gap-4 p-3 transition-colors duration-100 hover:bg-surface-raised-hovered focus:bg-surface-raised-pressed rounded-md shadow-raised flex-1 bg-surface-raised"
							onClick={() => router.push(`${base}/${client.id}`)}
						>
							<div className="flex min-w-0 flex-1 items-center gap-3 font-body-sm">
								<Initials name={client.name} />
								{/* name, then e-mail below it, then phone below that (§4.1 step 2) */}
								<div className="flex min-w-0 flex-col">
									<Link
										href={`${base}/${client.id}`}
										className={`${NAME_LINK} max-w-full self-start truncate`}
										onClick={(event) => event.stopPropagation()}
									>
										{client.name}
									</Link>
									<span className="truncate text-text-primary">
										{client.email}
									</span>
									{client.phone && (
										<span className="text-text-secondary">
											{maskPhone(client.phone)}
										</span>
									)}
								</div>
							</div>
							<ClientBadges
								inactive={client.status === "inactive"}
								formName={client.formName}
							/>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
