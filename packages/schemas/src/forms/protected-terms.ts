import { textKey } from "./text-key.js";

// SPEC-0002 §3.4, verbatim. Single source for web and api. It changes only by amending the spec.
export const PROTECTED_TERMS = [
	// documents
	"cpf",
	"rg",
	"cnh",
	"cns",
	"cartão sus",
	"passaporte",
	"pis",
	"nis",
	"título de eleitor",
	"documento",
	// contact and location
	"endereço",
	"cep",
	"telefone",
	"celular",
	"whatsapp",
	"e-mail",
	"email",
	// identity
	"nascimento",
	"sexo",
	"gênero",
	"raça",
	"cor",
	"etnia",
	"nome da mãe",
	"filiação",
	// health (art. 5 II)
	"saúde",
	"diagnóstico",
	"doença",
	"cid",
	"medicamento",
	"medicação",
	"remédio",
	"alergia",
	"sintoma",
	"queixa",
	"anamnese",
	"prontuário",
	"histórico médico",
	"cirurgia",
	"gestação",
	"gravidez",
	"deficiência",
	"peso",
	"altura",
	"pressão",
	"exame",
	"tratamento",
	// other art. 11 data
	"religião",
	"crença",
	"orientação sexual",
	"sindicato",
	"partido",
	"opinião política",
	"biometria",
	"genético",
	// English UI equivalents
	"ssn",
	"passport",
	"address",
	"phone",
	"birth",
	"gender",
	"health",
	"diagnosis",
	"medication",
	"allergy",
	"symptom",
	"religion",
] as const;

// SPEC-0002 §3.1: types marked "always" and types marked "label check"
export const ALWAYS_PROTECTED_TYPES = ["email", "phone", "cpf", "full_name", "address"] as const;
export const LABEL_CHECK_TYPES = ["text", "long_text", "number", "date", "yes_no", "select"] as const;

export type ProtectionLock = "type" | "label";

const TERM_KEYS = PROTECTED_TERMS.map(textKey);

const isLetterOrDigit = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char);

/**
 * True when the label contains a protected term as a whole word or phrase: both sides go through
 * `textKey`, and the match must be bounded by the start or end of the label or by a character that
 * is not a letter or digit. "PESO (kg)" matches "peso"; "Receptor" does not match "cep".
 */
export function labelHasProtectedTerm(label: string): boolean {
	const key = textKey(label);
	return TERM_KEYS.some((term) => {
		let from = key.indexOf(term);
		while (from !== -1) {
			const before = key[from - 1];
			const after = key[from + term.length];
			if (!isLetterOrDigit(before) && !isLetterOrDigit(after)) return true;
			from = key.indexOf(term, from + 1);
		}
		return false;
	});
}

/**
 * Why a custom field's protection is locked ON: `"type"` for an always-protected type, `"label"`
 * for a label-check type whose label matches, otherwise `null`. Pass custom fields only: system
 * fields are never locked (R4).
 */
export function protectionLock(type: string, label: string): ProtectionLock | null {
	if ((ALWAYS_PROTECTED_TYPES as readonly string[]).includes(type)) return "type";
	if ((LABEL_CHECK_TYPES as readonly string[]).includes(type) && labelHasProtectedTerm(label)) {
		return "label";
	}
	return null;
}
