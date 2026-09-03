/**
 *  joao.silva@gmail.com -> j**@**.com
 * */

export function maskEmail(email: string): string {
	const at = email.lastIndexOf("@");
	if (at < 1) return "***";

	const local = email.slice(0, at);
	const domain = email.slice(at);
	const dot = domain.lastIndexOf(".");
	const tld = dot === -1 ? "" : domain.slice(dot);

	return `${local[0]}***@${domain[0] ?? ""}***${tld}`;
}
