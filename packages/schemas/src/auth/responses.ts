import { z } from "zod";

export const AuthUserSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	name: z.string(),
	surname: z.string(),
	slug: z.string(),
	displayName: z.string(),
	avatarUrl: z.string().nullable(),
	emailVerified: z.boolean(),
});

/**
 * what POST /auth/login, register and refresh return.
 *
 * The tokens will be handed to the BFF (`/api/auth/session`), which
 * puts them in httpOnly cookies */
export const SessionResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	expiresIn: z.number().int().positive(),
	user: AuthUserSchema,
});

// POST /auth/email/verify
export const EmailVerifiedResponseSchema = z.object({
	emailVerificationToken: z.string(),
	expiresIn: z.number().int().positive(),
});

// GET /auth/availability
export const AvailabilityResponseSchema = z.object({
	available: z.boolean(),
});

// GET /auth/me
export const MeResponseSchema = AuthUserSchema;

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type EmailVerifiedResponse = z.infer<typeof EmailVerifiedResponseSchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
