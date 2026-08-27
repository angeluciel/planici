import { EMAIL_CODE_LENGTH } from "@planici/schemas";

export type VerificationResult = { ok: true } | { ok: false; error: string };

/**
 *  TODO: point at `apps/api` POST /auth/email/code
 * */
export async function requestEmailCode(
	email: string,
): Promise<VerificationResult> {
	console.info("requestEmailCode", { email, EMAIL_CODE_LENGTH });
	return { ok: true };
}

/**
 * TODO: point at `apps/api` POST /auth/email/verify
 * */

export async function verifyEmailCode(
	email: string,
	code: string,
): Promise<VerificationResult> {
	console.info("verifyEmailCode", {
		email,
		code: "[redacted]",
		lenghth: code.length,
	});
	return { ok: true };
}
