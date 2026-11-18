"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const MASK = "••••••";

// R9: a protected value is masked until the professional asks for it, one
// field at a time. The state is local, so leaving the page masks it again.
// While masked the value is not in the DOM at all.
export function ProtectedValue({
	entity,
	label,
	value,
}: Readonly<{ entity: string; label: string; value: string }>) {
	const t = useTranslations(`${entity}.view`);
	const [shown, setShown] = useState(false);

	return (
		<span className="flex flex-wrap items-center gap-2">
			{shown ? (
				<span className="whitespace-pre-line break-words">{value}</span>
			) : (
				<span aria-hidden="true">{MASK}</span>
			)}
			<button
				type="button"
				aria-label={`${t(shown ? "hide" : "reveal")} ${label}`}
				onClick={() => setShown((current) => !current)}
				className="cursor-pointer font-body-sm text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
			>
				{t(shown ? "hide" : "reveal")}
			</button>
		</span>
	);
}
