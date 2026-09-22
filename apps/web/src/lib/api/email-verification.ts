import {
	type EmailVerifiedResponse,
	EmailVerifiedResponseSchema,
	RequestEmailCodeSchema,
	VerifyEmailCodeSchema,
} from "@planici/schemas";
import { type ApiFailure, apiFailure, authClient } from "./client";

export type VerificationResult = { ok: true } | ApiFailure;
export type VerifyEmailResult =
	| ({ ok: true } & EmailVerifiedResponse)
	| ApiFailure;

export async function requestEmailCode(
	email: string,
): Promise<VerificationResult> {
	try {
		const body = RequestEmailCodeSchema.parse({ email });
		await authClient.post("/email/code", body);
		return { ok: true };
	} catch (error) {
		return apiFailure(error);
	}
}

export async function verifyEmailCode(
	email: string,
	code: string,
): Promise<VerifyEmailResult> {
	try {
		const body = VerifyEmailCodeSchema.parse({ email, code });
		const response = await authClient.post<unknown>("/email/verify", body);
		const proof = EmailVerifiedResponseSchema.safeParse(response.data);

		return proof.success
			? { ok: true, ...proof.data }
			: { ok: false, error: "unexpected" };
	} catch (error) {
		return apiFailure(error);
	}
}
