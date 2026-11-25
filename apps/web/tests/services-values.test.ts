// W-sval: SPEC-0005 R12 (duration display), R13 (duration input), R5 and the
// price mask (AC-0005-20, -56, -77 to -81 at the unit level). Pure functions:
//   apps/web/src/lib/services/duration.ts -> parseDuration, formatDuration
//   apps/web/src/lib/services/price.ts    -> parsePriceMask, formatPrice
//
// parseDuration(text): minutes, or null when the text is unreadable (R13). It
// does not check R4's 5-1,440 range: that is the schema's (AC-0005-78).
// parsePriceMask(text): centavos for a masked price ("150,00"); the dot groups
// thousands, the comma starts the two decimals.
import { describe, expect, it } from "vitest";
import { formatDuration, parseDuration } from "@/lib/services/duration";
import { formatPrice, parsePriceMask } from "@/lib/services/price";

const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatDuration (R12)", () => {
	it.each([
		[45, "45min"],
		[5, "5min"],
		[59, "59min"],
		[120, "2h"],
		[60, "1h"],
		[1440, "24h"],
		[90, "1h 30min"],
		[80, "1h 20min"],
		[61, "1h 1min"],
		[135, "2h 15min"],
	])("AC-0005-61 shows %i minutes as %s", (minutes, shown) => {
		expect(formatDuration(minutes)).toBe(shown);
	});

	it("AC-0005-62 shows 120 minutes as whole hours", () => {
		expect(formatDuration(120)).toBe("2h");
	});

	it("AC-0005-80 shows 90 minutes as '1h 30min'", () => {
		expect(formatDuration(90)).toBe("1h 30min");
	});
});

describe("parseDuration (R13)", () => {
	it.each([
		["1h 30", 90],
		["1h30", 90],
		["1h 30min", 90],
		["1h", 60],
		["2h", 120],
		["90", 90],
		["90min", 90],
		["45", 45],
		["5", 5],
		["24h", 1440],
		["1h 59", 119],
		["1h 0", 60],
	])("AC-0005-56 reads %j as %i minutes", (typed, minutes) => {
		expect(parseDuration(typed)).toBe(minutes);
	});

	it.each([
		["1H 30", 90],
		["1H30MIN", 90],
		["90MIN", 90],
		["1H", 60],
		["  1h 30  ", 90],
		["1 h 30", 90],
		["1h  30 min", 90],
		[" 90 min ", 90],
	])("AC-0005-56 ignores case and spaces: reads %j as %i minutes", (typed, minutes) => {
		expect(parseDuration(typed)).toBe(minutes);
	});

	it.each([
		["1:30"],
		["1h 75"],
		["1h 60"],
		["1,5h"],
		["1.5h"],
		["90.5"],
		["90,5"],
		["abc"],
		["h"],
		["1h 30 min extra"],
		["1h30m"],
		["-90"],
	])("AC-0005-77 finds %j unreadable", (typed) => {
		expect(parseDuration(typed)).toBeNull();
	});

	it("AC-0005-79 finds '1h 75' unreadable: with hours given the minutes are 0 to 59", () => {
		expect(parseDuration("1h 75")).toBeNull();
		expect(parseDuration("1h 60")).toBeNull();
		expect(parseDuration("1h 59")).toBe(119);
	});

	it("AC-0005-80 reads back what the edit page fills in: every duration of R4 round-trips through its display form", () => {
		for (let minutes = 5; minutes <= 1440; minutes += 1) {
			expect(parseDuration(formatDuration(minutes))).toBe(minutes);
		}
	});
});

describe("formatPrice", () => {
	it.each([
		[15000, "R$ 150,00"],
		[0, "R$ 0,00"],
		[5, "R$ 0,05"],
		[100, "R$ 1,00"],
		[9999, "R$ 99,99"],
		[150000, "R$ 1.500,00"],
		[99999999, "R$ 999.999,99"],
	])("AC-0005-57 shows %i centavos as %s", (cents, shown) => {
		expect(plain(formatPrice(cents))).toBe(shown);
	});
});

describe("parsePriceMask", () => {
	it.each([
		["150,00", 15000],
		["0,00", 0],
		["0,05", 5],
		["1,00", 100],
		["99,99", 9999],
		["1.500,00", 150000],
		["999.999,99", 99999999],
	])("AC-0005-20 reads the masked price %s as %i centavos", (typed, cents) => {
		expect(parsePriceMask(typed)).toBe(cents);
	});

	it("AC-0005-20 reads back what formatPrice shows, without the currency sign", () => {
		for (const cents of [0, 5, 100, 9999, 15000, 150000, 99999999]) {
			const masked = plain(formatPrice(cents)).replace("R$ ", "");
			expect(parsePriceMask(masked)).toBe(cents);
		}
	});
});
