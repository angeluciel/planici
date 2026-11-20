"use client";

import type { ClientSummary } from "@planici/schemas";
import { useFormatter } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ClientBadges } from "./client-badges";
import { Initials, NAME_LINK } from "./client-rows";

// "Érica" -> "E"; "#" when the first character is not a letter
export function letterOf(name: string) {
	const first =
		[...name.trim().normalize("NFD").replace(/\p{M}/gu, "")][0] ?? "";
	return /\p{L}/u.test(first) ? first.toLocaleUpperCase() : "#";
}

type Group = { letter: string; cards: ClientSummary[] };

// A heading only where the letter differs from the previous card's, so a page
// that continues the last letter adds none (§4.6 step 7).
function group(rows: ClientSummary[]): Group[] {
	const groups: Group[] = [];
	for (const row of rows) {
		const letter = letterOf(row.name);
		const last = groups.at(-1);
		if (last?.letter === letter) last.cards.push(row);
		else groups.push({ letter, cards: [row] });
	}
	return groups;
}

// Narrow screens: cards under letter headings.
export function ClientCards({
	rows,
	base,
	lastRef,
}: Readonly<{
	rows: ClientSummary[];
	base: string;
	lastRef: (element: HTMLElement | null) => void;
}>) {
	const router = useRouter();
	const format = useFormatter();
	// the browser's own zone, explicit: the provider's is the server's (Q26)
	const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const thisYear = format.dateTime(new Date(), {
		year: "numeric",
		timeZone: zone,
	});

	const dateOf = (iso: string) => {
		const date = new Date(iso);
		const sameYear =
			format.dateTime(date, { year: "numeric", timeZone: zone }) === thisYear;
		return format.dateTime(date, {
			day: "2-digit",
			month: "2-digit",
			...(sameYear ? {} : { year: "numeric" as const }),
			timeZone: zone,
		});
	};

	const last = rows.at(-1);
	return (
		<div className="flex flex-col gap-4">
			{group(rows).map(({ letter, cards }) => (
				<section
					key={`${letter}-${cards[0]?.id}`}
					className="flex flex-col gap-2"
				>
					<h2 className="px-1 font-body-sm font-semibold text-text-secondary">
						{letter}
					</h2>
					<ul className="flex flex-col gap-2">
						{cards.map((client) => (
							// biome-ignore lint/a11y/useKeyWithClickEvents: the name link is the keyboard path
							<li
								key={client.id}
								ref={client === last ? lastRef : undefined}
								className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors duration-100 hover:bg-surface-hovered"
								onClick={() => router.push(`${base}/${client.id}`)}
							>
								<Initials name={client.name} />
								<div className="flex min-w-0 flex-1 flex-col gap-1 font-body-sm">
									<Link
										href={`${base}/${client.id}`}
										className={`${NAME_LINK} w-fit`}
										onClick={(event) => event.stopPropagation()}
									>
										{client.name}
									</Link>
									<span className="truncate text-text-primary">
										{client.email}
									</span>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<ClientBadges
											inactive={client.status === "inactive"}
											formName={client.formName}
										/>
										<span className="text-text-secondary">
											{dateOf(client.updatedAt)}
										</span>
									</div>
								</div>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
