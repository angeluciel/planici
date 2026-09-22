import {
	type AuthUser,
	AuthUserSchema,
	AvailabilityQuerySchema,
	AvailabilityResponseSchema,
	type RegisterRequestInput,
	RegisterRequestSchema,
} from "@planici/schemas";
import { z } from "zod";
import type { RegisterData } from "@/types/register";
import { hasEmailProof, hasGoogleCredential } from "../register-flow";
import { type ApiFailure, apiFailure, authClient } from "./client";

export type RegisterPayload = RegisterRequestInput;
export type RegisterResult = { ok: true; user: AuthUser } | ApiFailure;
const RegisteredSchema = z.object({
	ok: z.literal(true),
	user: AuthUserSchema,
});

export function toRegisterPayload(data: RegisterData): RegisterPayload {
	const common = {
		email: data.email,
		name: data.name,
		surname: data.surname,
		slug: data.slug,
		consent: {
			acceptedTerms: data.acceptedTerms,
			marketingOptIn: data.marketingOptIn,
			termsVersion: data.termsVersion,
			acceptedAt: data.acceptedTermsAt ?? "",
		},
	};

	return RegisterRequestSchema.parse(
		data.provider === "email"
			? {
					...common,
					provider: "email",
					password: data.password,
					emailVerificationToken: data.emailVerificationToken ?? "",
				}
			: {
					...common,
					provider: "google",
					idToken: data.idToken ?? "",
				},
	);
}

export async function registerUser(
	data: RegisterData,
): Promise<RegisterResult> {
	if (data.provider === "email" && !hasEmailProof(data)) {
		return {
			ok: false,
			error: "verification.expired",
			field: "emailVerificationToken",
		};
	}

	if (data.provider === "google" && !hasGoogleCredential(data)) {
		return { ok: false, error: "google.expired", field: "idToken" };
	}
	try {
		const payload = toRegisterPayload(data);
		const response = await authClient.post<unknown>("/register", payload);
		const registered = RegisteredSchema.safeParse(response.data);
		return registered.success
			? registered.data
			: { ok: false, error: "unexpected" };
	} catch (error) {
		return apiFailure(error);
	}
}

export async function checkAvailability(query: {
	email?: string;
	slug?: string;
}): Promise<{ ok: true; available: boolean } | ApiFailure> {
	try {
		const params = AvailabilityQuerySchema.parse(query);
		const response = await authClient.get<unknown>("/availability", { params });
		const result = AvailabilityResponseSchema.safeParse(response.data);
		return result.success
			? { ok: true, ...result.data }
			: { ok: false, error: "unexpected" };
	} catch (error) {
		return apiFailure(error);
	}
}
