// SPEC-0003 §3.1, the "shown as" column: the text the record view shows for one
// stored value (apps/web/src/app/[lang]/(private)/orgs/[tenant]/_components/
// records/format-value.ts -> formatFieldValue). Pure function, so it runs
// against a real next-intl formatter instead of a rendered view. The global
// time zone is not UTC on purpose: a date must still show the stored day.
import type { Field } from "@planici/schemas";
import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { formatFieldValue } from "@/app/[lang]/(private)/orgs/[tenant]/_components/records/format-value";

type FieldShape = Pick<Field, "type" | "options">;

const deps = (locale: "pt-BR" | "en-US" = "pt-BR") => ({
	format: createFormatter({ locale, timeZone: "America/Sao_Paulo" }),
	yes: "Sim",
	no: "Não",
});

const field = (
	type: Field["type"],
	options: Field["options"] = null,
): FieldShape => ({ type, options });

const show = (shape: FieldShape, value: unknown, locale?: "pt-BR" | "en-US") =>
	formatFieldValue(shape, value, deps(locale));

const ALL_TYPES: Field["type"][] = [
	"text",
	"long_text",
	"number",
	"date",
	"yes_no",
	"select",
	"email",
	"phone",
	"cpf",
	"full_name",
	"address",
	"duration",
	"money",
];

describe("formatFieldValue: no value", () => {
	it.each(ALL_TYPES)("shows nothing for a null or undefined %s", (type) => {
		expect(show(field(type), null)).toBe("");
		expect(show(field(type), undefined)).toBe("");
	});
});

describe("formatFieldValue: yes_no", () => {
	it("shows yes only for true", () => {
		expect(show(field("yes_no"), true)).toBe("Sim");
		expect(show(field("yes_no"), false)).toBe("Não");
		expect(show(field("yes_no"), "true")).toBe("Não");
		expect(show(field("yes_no"), 1)).toBe("Não");
	});
});

describe("formatFieldValue: number", () => {
	it.each([
		[3, "3"],
		[1.5, "1,5"],
		[1234.567, "1.234,57"],
		[-0.004, "-0"],
		[0, "0"],
	])("shows %s as %s in pt-BR", (value, shown) => {
		expect(show(field("number"), value)).toBe(shown);
	});

	it("follows the active locale", () => {
		expect(show(field("number"), 1234.567, "en-US")).toBe("1,234.57");
	});

	it("shows nothing for a value that is not a number", () => {
		expect(show(field("number"), "12")).toBe("");
		expect(show(field("number"), true)).toBe("");
	});
});

describe("formatFieldValue: date", () => {
	it("shows the stored day, whatever the time zone", () => {
		expect(show(field("date"), "2024-03-09")).toBe("09/03/2024");
		expect(show(field("date"), "2024-01-01")).toBe("01/01/2024");
		expect(show(field("date"), "2024-03-09", "en-US")).toBe("03/09/2024");
	});

	it("rolls an out-of-range day over like Date.UTC", () => {
		expect(show(field("date"), "2024-02-30")).toBe("01/03/2024");
	});

	it.each([
		["2024-3-9"],
		["2024-03-09T00:00:00Z"],
		[" 2024-03-09"],
		["09/03/2024"],
		[""],
		[20240309],
		[{}],
	])("shows nothing for %j", (value) => {
		expect(show(field("date"), value)).toBe("");
	});
});

describe("formatFieldValue: select", () => {
	const options = [
		{ id: "opt-a", label: "Primeira" },
		{ id: "opt-b", label: "Segunda" },
	];

	it("shows the label of the stored option", () => {
		expect(show(field("select", options), "opt-b")).toBe("Segunda");
	});

	it("shows nothing for an unknown option or a field without options", () => {
		expect(show(field("select", options), "opt-z")).toBe("");
		expect(show(field("select", null), "opt-a")).toBe("");
		expect(show(field("select", []), "opt-a")).toBe("");
	});
});

describe("formatFieldValue: phone and cpf", () => {
	it("masks the stored digits", () => {
		expect(show(field("phone"), "11987654321")).toBe("(11) 98765-4321");
		expect(show(field("phone"), "1187654321")).toBe("(11) 8765-4321");
		expect(show(field("cpf"), "12345678901")).toBe("123.456.789-01");
		expect(show(field("phone"), "")).toBe("");
		expect(show(field("cpf"), "")).toBe("");
	});

	it("shows nothing for a value that is not text", () => {
		expect(show(field("phone"), 11987654321)).toBe("");
		expect(show(field("cpf"), 12345678901)).toBe("");
	});
});

describe("formatFieldValue: address", () => {
	it("joins the filled parts and masks the cep", () => {
		expect(
			show(field("address"), {
				street: "Rua das Flores",
				number: "10",
				complement: "Apto 2",
				district: "Centro",
				city: "São Paulo",
				state: "SP",
				cep: "01234567",
			}),
		).toBe("Rua das Flores, 10, Apto 2, Centro, São Paulo/SP, 01234-567");
	});

	it("trims parts and skips blank or non-text ones", () => {
		expect(
			show(field("address"), {
				street: "  Rua A  ",
				number: 10,
				complement: "   ",
				city: "Campinas",
				cep: "",
			}),
		).toBe("Rua A, Campinas");
		expect(show(field("address"), { state: "SP", cep: "13010-000" })).toBe(
			"SP, 13010-000",
		);
	});

	it("shows nothing for an empty address or a value that is not an object", () => {
		expect(show(field("address"), {})).toBe("");
		expect(show(field("address"), [])).toBe("");
		expect(show(field("address"), "Rua A")).toBe("");
		expect(show(field("address"), 10)).toBe("");
	});
});

describe("formatFieldValue: text-like and system-only types", () => {
	it.each([
		"text",
		"long_text",
		"email",
		"full_name",
		"duration",
		"money",
	] as const)("shows a %s string as stored", (type) => {
		expect(show(field(type), "  As stored  ")).toBe("  As stored  ");
		expect(show(field(type), "")).toBe("");
	});

	it.each([
		"text",
		"long_text",
		"email",
		"full_name",
		"duration",
		"money",
	] as const)("shows nothing for a %s value that is not text", (type) => {
		expect(show(field(type), 90)).toBe("");
		expect(show(field(type), true)).toBe("");
		expect(show(field(type), { a: "b" })).toBe("");
	});
});
