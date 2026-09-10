import type { LoginData } from "@/types/login";
import type { GoogleProfile } from "@/types/register";
import { requestGoogleIdToken } from "./google";

export type LoginResult =
	| { ok: true }
	| { ok: false; error: string; field?: "email" | "password" };

export type LoginPayload =
	| { provider: "email"; email: string; password: string; rememberMe?: boolean }
	| { provider: "google"; idToken: string; rememberMe?: boolean };

/** TODO: POINT AT `apps/api` POST /auth/login
 * A validação do backend deve mapear os erros para as keys do i18n
 * tipo `email.taken`
 *
 */

export const SESSION_ENDPOINT = "/api/auth/session";

function toLoginPayload(data: LoginData): LoginPayload {
	switch (data.provider) {
		case "email":
			return {
				provider: "email",
				email: data.email,
				password: data.password,
				rememberMe: data.rememberMe,
			};
		case "google":
			return {
				provider: "google",
				idToken: data.idToken,
				rememberMe: data.rememberMe,
			};
		default: {
			const unreachable: never = data;
			throw new Error(`Unknown login provider: ${JSON.stringify(unreachable)}`);
		}
	}
}

interface SessionErrorBody {
	error?: string;
	field?: "email" | "password";
}

export async function login(data: LoginData): Promise<LoginResult> {
	const payload = toLoginPayload(data);

	let response: Response;

	try {
		response = await fetch(SESSION_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
	} catch {
		return { ok: false, error: "network.unavailable" };
	}

	if (response.ok) return { ok: true };

	const body = (await response
		.json()
		.catch(() => null)) as SessionErrorBody | null;

	// The server speaks i18n keys (`credentials.invalid`, `account.locked`, …)
	// so `useFieldError` can translate them without a mapping table here.
	return { ok: false, error: body?.error ?? "unexpected", field: body?.field };
}

export async function signInWithGoogle(
	rememberMe = false,
): Promise<LoginResult> {
	const credential = await requestGoogleIdToken();
	if (!credential.ok) return { ok: false, error: credential.error };

	return login({ provider: "google", idToken: credential.idToken, rememberMe });
}

export async function logout(): Promise<void> {
	await fetch(SESSION_ENDPOINT, { method: "DELETE" });
}
