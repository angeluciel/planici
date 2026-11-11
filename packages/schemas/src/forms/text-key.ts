/**
 * Comparison key for names, labels and option texts: lowercase, accents
 * stripped, whitespace trimmed and collapsed. Used for `forms.name_key` and
 * for label and option uniqueness.
 */
export function textKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}+/gu, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}
