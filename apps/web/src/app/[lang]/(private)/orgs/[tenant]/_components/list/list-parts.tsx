import { useTranslations } from "next-intl";

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

// "Érica" -> "E"; "#" when the first character is not a letter
export function letterOf(name: string) {
	const first =
		[...name.trim().normalize("NFD").replace(/\p{M}/gu, "")][0] ?? "";
	return /\p{L}/u.test(first) ? first.toLocaleUpperCase() : "#";
}

// "Inativo", then the template badge, shared by row and card (SPEC-0006 R6).
export function ListBadges({
	namespace,
	inactive,
	formName,
}: Readonly<{ namespace: string; inactive: boolean; formName: string }>) {
	const t = useTranslations(namespace);
	return (
		<span className="flex flex-wrap items-center gap-2">
			{inactive && (
				<span className="rounded-sm border border-border-danger px-2 py-1 font-body-caption text-text-status-danger-bolder">
					{t("list.inactiveBadge")}
				</span>
			)}
			<span className="rounded-sm py-1 px-2 font-body-caption bg-background-accent-green-bold text-text-inverse font-semibold">
				{formName.slice(0, 12)}
			</span>
		</span>
	);
}
