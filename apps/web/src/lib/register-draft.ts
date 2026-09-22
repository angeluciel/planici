import { z } from "zod";
import { EMPTY_REGISTER_DATA, type RegisterData } from "@/types/register";
import { TERMS_VERSION } from "./legal";

export const DRAFT_KEY = "planici_register_draft";

const DraftSchema = z.object({
	email: z.string().default(""),
	name: z.string().default(""),
	surname: z.string().default(""),
	slug: z.string().default(""),
	provider: z.enum(["email", "google"]).default("email"),
	acceptedTerms: z.boolean().default(false),
	marketingOptIn: z.boolean().default(false),
	termsVersion: z.string().default(""),
	acceptedTermsAt: z.iso.datetime().nullable().default(null),
	codeResendAt: z.iso.datetime().nullable().default(null),
});

export function restoreRegisterDraft(raw: string | null): RegisterData {
	try {
		const parsed = DraftSchema.safeParse(raw ? JSON.parse(raw) : {});
		if (!parsed.success) return { ...EMPTY_REGISTER_DATA };
		const data = { ...EMPTY_REGISTER_DATA, ...parsed.data };
		if (data.termsVersion !== TERMS_VERSION) {
			data.acceptedTerms = false;
			data.acceptedTermsAt = null;
			data.termsVersion = "";
		}
		return data;
	} catch {
		return { ...EMPTY_REGISTER_DATA };
	}
}

export function serializeRegisterDraft(data: RegisterData): string {
	return JSON.stringify(DraftSchema.parse(data));
}
