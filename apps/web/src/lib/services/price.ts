// Prices travel as integer centavos (api-convention, Money); BRL only (R5).

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

export function formatPrice(cents: number): string {
	return BRL.format(cents / 100);
}

// "1.500,00" -> 150000: the dot groups thousands, the comma starts two decimals
export function parsePriceMask(text: string): number | null {
	const match = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(text.trim());
	if (!match) return null;
	return Number(match[1]?.replaceAll(".", "")) * 100 + Number(match[2]);
}

// The input's mask (§4.3): the digits typed fill the centavos, so "15000" and
// "150,00" both show "150,00"; "" while there is no digit.
export function maskPrice(text: string): string {
	const digits = text.replace(/\D/g, "").slice(0, 10);
	if (digits === "") return "";
	const cents = Number(digits);
	const reais = String(Math.floor(cents / 100)).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		".",
	);
	return `${reais},${String(cents % 100).padStart(2, "0")}`;
}
