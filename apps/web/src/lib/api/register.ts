import type {
	GoogleProfile,
	RegisterData,
	RegisterProvider,
} from "@/types/register";

export type RegisterResult =
	| { ok: true }
	| { ok: false; error: string; field?: keyof RegisterData };

/**
 * What the backend will need in order to satisfy RNF-12: the account fields
 * plus a traceable consent record.
 * */

export type RegisterPayload = {
	email: string;

	password?: string;
	provider: RegisterProvider;

	emailConfirmed: boolean;
	name: string;
	surname: string;
	slug: string;
	consent: {
		acceptedTerms: true;
		marketingOptIn: boolean;
		termsVersion: string;
		acceptedAt: string;
	};
};

export function toRegisterPayload(data: RegisterData): RegisterPayload {
	return {
		email: data.email,
		password: data.provider === "email" ? data.password : undefined,
		provider: data.provider,
		emailConfirmed: data.confirmedEmail,
		name: data.name,
		surname: data.surname,
		slug: data.slug,
		consent: {
			acceptedTerms: true,
			marketingOptIn: data.marketingOptIn,
			termsVersion: data.termsVersion,
			acceptedAt: data.acceptedTermsAt ?? new Date().toISOString(),
		},
	};
}

/** TODO: POINT AT `apps/api` POST /auth/register
 * A validação do backend deve mapear os erros para as keys do i18n
 * tipo `email.taken`
 *
 * Sucesso = api manda o email de verificação
 * TODO: fazer tela de verificacao de email
 */

export async function registerUser(
	data: RegisterData,
): Promise<RegisterResult> {
	const payload = toRegisterPayload(data);

	console.info("registeruser payload", { ...payload, password: "[redacted]" });
	return { ok: true };
}

export type GoogleSignInResult =
	| { ok: true; profile: GoogleProfile }
	| { ok: false; error: string };

export async function signInWithGoogle(): Promise<RegisterResult> {
	console.info("signInWithGoogle: not wired yet :P");
	return { ok: false, error: "unexpected" };
}
