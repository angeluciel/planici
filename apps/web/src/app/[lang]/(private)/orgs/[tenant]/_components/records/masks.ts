// Display masks for the digit-only types of SPEC-0003 §3.1. They take any text,
// keep its digits and format them while typing; the shared schemas strip the
// punctuation again before validating, so a masked value is always accepted.

const digits = (value: string, max: number) =>
	value.replaceAll(/\D/g, "").slice(0, max);

/** `(11) 98765-4321`, or `(11) 8765-4321` for a 10-digit number. */
export function maskPhone(value: string): string {
	const d = digits(value, 11);
	if (d.length === 0) return "";
	if (d.length <= 2) return `(${d}`;
	if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
	const split = d.length === 11 ? 7 : 6;
	return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

/** `000.000.000-00` */
export function maskCpf(value: string): string {
	const d = digits(value, 11);
	if (d.length <= 3) return d;
	if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
	if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** `00000-000` */
export function maskCep(value: string): string {
	const d = digits(value, 8);
	return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}
