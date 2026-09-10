import { z } from "zod";
export declare const AuthUserSchema: z.ZodObject<
	{
		id: z.ZodUUID;
		email: z.ZodEmail;
		name: z.ZodString;
		surname: z.ZodString;
		slug: z.ZodString;
		displayName: z.ZodString;
		avatarUrl: z.ZodNullable<z.ZodString>;
		emailVerified: z.ZodBoolean;
	},
	z.core.$strip
>;
/**
 * what POST /auth/login, register and refresh return.
 *
 * The tokens will be handed to the BFF (`/api/auth/session`), which
 * puts them in httpOnly cookies */
export declare const SessionResponseSchema: z.ZodObject<
	{
		accessToken: z.ZodString;
		refreshToken: z.ZodString;
		expiresIn: z.ZodNumber;
		user: z.ZodObject<
			{
				id: z.ZodUUID;
				email: z.ZodEmail;
				name: z.ZodString;
				surname: z.ZodString;
				slug: z.ZodString;
				displayName: z.ZodString;
				avatarUrl: z.ZodNullable<z.ZodString>;
				emailVerified: z.ZodBoolean;
			},
			z.core.$strip
		>;
	},
	z.core.$strip
>;
export declare const EmailVerifiedResponseSchema: z.ZodObject<
	{
		emailVerificationToken: z.ZodString;
		expiresIn: z.ZodNumber;
	},
	z.core.$strip
>;
export declare const AvailabilityResponseSchema: z.ZodObject<
	{
		available: z.ZodBoolean;
	},
	z.core.$strip
>;
export declare const MeResponseSchema: z.ZodObject<
	{
		id: z.ZodUUID;
		email: z.ZodEmail;
		name: z.ZodString;
		surname: z.ZodString;
		slug: z.ZodString;
		displayName: z.ZodString;
		avatarUrl: z.ZodNullable<z.ZodString>;
		emailVerified: z.ZodBoolean;
	},
	z.core.$strip
>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type EmailVerifiedResponse = z.infer<typeof EmailVerifiedResponseSchema>;
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
//# sourceMappingURL=responses.d.ts.map
